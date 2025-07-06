import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BOG_API_CONFIG } from './bog-api.config';
import { TokenResponseDto } from './dto/token-response.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Car, CarDocument } from '../cars/schemas/car.schema';
import { CarsService } from '../cars/cars.service';
import { UsersService } from '../users/users.service';
import { ProcessedEntry, ProcessedEntryDocument } from './schemas/processed-entry.schema';

interface SenderDetails {
  Name: string;
  Inn: string;
  AccountNumber: string;
  BankCode: string | null;
  BankName: string;
}

interface BeneficiaryDetails {
  Name: string;
  Inn: string | null;
  AccountNumber: string;
  BankCode: string | null;
  BankName: string;
}

interface StatementEntry {
  EntryDate: string;
  EntryDocumentNumber: string;
  EntryAccountNumber: string;
  EntryAmountDebit: number;
  EntryAmountDebitBase: number;
  EntryAmountCredit: number;
  EntryAmountCreditBase: number | null;
  EntryAmountBase: number;
  Credit: number; // Changed from EntryAmount to Credit
  EntryComment: string;
  EntryDepartment: string;
  EntryAccountPoint: string;
  DocumentProductGroup: string;
  DocumentValueDate: string;
  SenderDetails: SenderDetails;
  BeneficiaryDetails: BeneficiaryDetails;
  DocumentTreasuryCode: string | null;
  DocumentNomination: string;
  DocumentInformation: string;
  DocumentSourceAmount: number;
  DocumentSourceCurrency: string;
  DocumentDestinationAmount: number;
  DocumentDestinationCurrency: string;
  DocumentReceiveDate: string;
  DocumentBranch: string;
  DocumentDepartment: string;
  DocumentActualDate: string | null;
  DocumentExpiryDate: string | null;
  DocumentRateLimit: number | null;
  DocumentRate: number | null;
  DocumentRegistrationRate: number | null;
  DocumentSenderInstitution: string | null;
  DocumentIntermediaryInstitution: string | null;
  DocumentBeneficiaryInstitution: string | null;
  DocumentPayee: string | null;
  DocumentCorrespondentAccountNumber: string;
  DocumentCorrespondentBankCode: string | null;
  DocumentCorrespondentBankName: string | null;
  DocumentKey: number;
  Id: number;
  DocumentPayerName: string;
  DocumentPayerInn: string;
  DocComment: string;
}

// Changed: StatementResponse is now directly an array of StatementEntry objects
type StatementResponse = StatementEntry[];

@Injectable()
export class BogApiService {
  private tokenCache: {
    token: string;
    expiresAt: number;
  } | null = null;

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Car.name) private carModel: Model<CarDocument>,
    @InjectModel(ProcessedEntry.name)
    private processedEntryModel: Model<ProcessedEntryDocument>,
    private readonly carsService: CarsService,
    private readonly usersService: UsersService,
  ) {}

  private getBasicAuthHeader(): string {
    const credentials = `${BOG_API_CONFIG.clientId}:${BOG_API_CONFIG.clientSecret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private async fetchNewToken(): Promise<TokenResponseDto> {
    try {
      const formData = new URLSearchParams();
      formData.append('grant_type', 'client_credentials');
      formData.append('client_id', BOG_API_CONFIG.clientId);
      formData.append('client_secret', BOG_API_CONFIG.clientSecret);

      const response = await firstValueFrom(
        this.httpService.post<TokenResponseDto>(
          `${BOG_API_CONFIG.baseUrl}${BOG_API_CONFIG.tokenEndpoint}`,
          formData,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: this.getBasicAuthHeader(),
            },
          },
        ),
      );

      // Cache the token with expiration time (subtract 5 minutes for safety margin)
      this.tokenCache = {
        token: response.data.access_token,
        expiresAt: Date.now() + (response.data.expires_in - 300) * 1000,
      };

      return response.data;
    } catch (error) {
      console.error('Error fetching new token:', error);
      throw new HttpException(
        'Failed to get access token from BOG API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    // If no valid token exists, fetch a new one
    const tokenResponse = await this.fetchNewToken();
    return tokenResponse.access_token;
  }

  // Helper method to get headers with authorization
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  private async fetchUsdRate(): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ rate: number }>(BOG_API_CONFIG.nbgRate)
      );
      // If the API returns just a number, not an object, adjust accordingly
      const usdRate = typeof response.data === 'number' ? response.data : response.data.rate;
      if (!usdRate || isNaN(usdRate)) {
        throw new Error('Invalid USD rate received from nbgRate endpoint');
      }
      return usdRate;
    } catch (error) {
      console.error('Failed to fetch USD rate from nbgRate endpoint:', error);
      throw new HttpException('Failed to fetch USD rate', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async processStatementAndUpdateCars(statementData: StatementResponse, usdRate: number): Promise<void> {
    try {
      // Get all cars with their VIN codes and required fields
      const cars = await this.carModel
        .find({}, { vinCode: 1, carID: 1, auctionPriceToPay: 1, transPriceToPay: 1 })
        .lean();

      // Create a map of VIN codes to car data for quick lookup
      const vinCodeToCarData = new Map(
        cars.map((car) => [
          car.vinCode,
          {
            id: car.carID,
            auctionPriceToPay: car.auctionPriceToPay || 0,
            transPriceToPay: car.transPriceToPay || 0,
          },
        ]),
      );

      // Get all processed entry IDs in a single query
      const processedEntryIds = new Set(
        (await this.processedEntryModel.find({}, { entryId: 1 }).lean()).map(
          (entry) => entry.entryId,
        ),
      );

      // Process statement entries and collect updates
      const updates: { 
        id: number; 
        entryId: number; 
        finalCredit: number; 
        updateType: 'transportation' | 'auction' 
      }[] = [];
      const processedEntries: {
        entryId: number;
        amount: number;
        vinCode: string;
      }[] = [];

      if (statementData && Array.isArray(statementData)) {
        for (const entry of statementData) {
          // Skip if entry has already been processed (using in-memory Set)
          if (processedEntryIds.has(entry.Id)) {
            continue;
          }

          // Mark this entry as processed regardless of whether it has matching cars
          let foundMatch = false;
          let normalizedCredit = 0;
          let matchedVinCode = '';

          if (entry.EntryComment && entry.Credit) {
            // Normalize credit value first
            normalizedCredit = entry.Credit / usdRate;
            // If normalizedCredit > 10000, subtract 0.3%
            if (normalizedCredit > 10000) {
              const fee = normalizedCredit * 0.003;
              normalizedCredit = normalizedCredit - fee;
            }

            // Check for transportation keyword
            const hasTransportationKeyword = entry.EntryComment.includes('ტრანსპორტირებ');

            // Find matching car by VIN code in EntryComment
            for (const [vinCode, carData] of vinCodeToCarData.entries()) {
              if (entry.EntryComment.includes(vinCode)) {
                // Determine update type based on keyword presence
                const updateType = hasTransportationKeyword ? 'transportation' : 'auction';
                
                updates.push({
                  id: carData.id,
                  entryId: entry.Id,
                  finalCredit: normalizedCredit,
                  updateType: updateType,
                });

                foundMatch = true;
                matchedVinCode = vinCode;
                break; // Found the matching car, no need to check other VIN codes
              }
            }
          }

          // Always add to processedEntries to prevent reprocessing
          processedEntries.push({
            entryId: entry.Id,
            amount: normalizedCredit,
            vinCode: matchedVinCode, // Will be empty string if no match found
          });
        }
      }

      // Update cars using the dedicated methods (user balance updates are handled automatically)
      if (updates.length > 0) {
        for (const update of updates) {
          if (update.finalCredit > 0) {
            try {
              // Get current car data to calculate new ToPay values
              const currentCar = await this.carsService.findOne(update.id);
              
              if (update.updateType === 'transportation') {
                // Subtract from transPriceToPay
                const newTransPriceToPay = Math.max(0, (currentCar.transPriceToPay || 0) - update.finalCredit);
                await this.carsService.update(update.id, { transPriceToPay: newTransPriceToPay }, []);
                console.log(`Updated car ${update.id} transPriceToPay from ${currentCar.transPriceToPay} to ${newTransPriceToPay} (VIN + transportation keyword found)`);
              } else {
                // Subtract from auctionPriceToPay
                const newAuctionPriceToPay = Math.max(0, (currentCar.auctionPriceToPay || 0) - update.finalCredit);
                await this.carsService.update(update.id, { auctionPriceToPay: newAuctionPriceToPay }, []);
                console.log(`Updated car ${update.id} auctionPriceToPay from ${currentCar.auctionPriceToPay} to ${newAuctionPriceToPay} (VIN only found)`);
              }

              // Add the finalCredit to the car's paid field
              await this.carsService.updatePaid(update.id, update.finalCredit);
              console.log(`Updated car ${update.id} paid by +${update.finalCredit}`);
            } catch (error) {
              console.error(`Failed to update car ${update.id}:`, error);
              // Continue with other updates even if one fails
            }
          }
        }
      }

      // Store ALL processed entries (both matched and unmatched) to prevent reprocessing
      if (processedEntries.length > 0) {
        const processedEntryDocs = processedEntries.map((entry) => ({
          entryId: entry.entryId,
          amount: entry.amount,
          vinCode: entry.vinCode,
          processedAt: new Date(),
        }));

        await this.processedEntryModel.insertMany(processedEntryDocs, {
          ordered: false,
        });
        console.log(`Stored ${processedEntryDocs.length} processed entries (${updates.length} matched cars)`);
      }
    } catch (error) {
      console.error('Error processing statement and updating cars:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        timestamp: new Date().toISOString(),
      });
      throw new HttpException(
        `Failed to process statement and update cars: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStatement(
    accountNumber: string = 'GE40BG0000000498826082',
    currency: string = 'GEL',
  ): Promise<StatementResponse> {
    try {
      const usdRate = await this.fetchUsdRate();
      const headers = await this.getAuthHeaders();
      const url = `${BOG_API_CONFIG.statementEndpoint}/${accountNumber}/${currency}`;
      console.log('BOG API Request Details:', {
        url,
        headers: { ...headers, Authorization: 'Bearer ***' },
        accountNumber,
        currency,
        usdRate,
        timestamp: new Date().toISOString(),
      });
      const response = await firstValueFrom(
        this.httpService.get<StatementResponse>(url, { headers }),
      );
      console.log('BOG API Response Success:', {
        status: response.status,
        recordCount: response.data?.length || 0,
        usdRate,
        timestamp: new Date().toISOString(),
      });
      await this.processStatementAndUpdateCars(response.data, usdRate);
      return response.data;
    } catch (error) {
      console.error('BOG API Error Details:', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      if (error.response) {
        console.error('BOG API HTTP Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
          timestamp: new Date().toISOString(),
        });
      } else if (error.request) {
        console.error('BOG API Network Error:', {
          message: 'No response received from server',
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          hostname: error.hostname,
          timestamp: new Date().toISOString(),
        });
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Authentication error detected, clearing token cache');
        this.tokenCache = null;
        throw new HttpException(
          `Authentication failed for BOG API: ${error.response?.data?.error || error.message}`,
          HttpStatus.UNAUTHORIZED,
        );
      }
      throw new HttpException(
        `Failed to fetch statement from BOG API: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
