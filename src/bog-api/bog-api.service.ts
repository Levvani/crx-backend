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
  EntryAmount: number;
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
  EntryId: number;
  DocumentPayerName: string;
  DocumentPayerInn: string;
  DocComment: string;
}

interface StatementResponse {
  Records: StatementEntry[];
}

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

  private async processStatementAndUpdateCars(statementData: StatementResponse): Promise<void> {
    try {
      // Get all cars with their VIN codes and required fields for totalCost calculation
      const cars = await this.carModel
        .find({}, { vinCode: 1, toBePaid: 1, carID: 1, transportationPrice: 1 })
        .lean();

      // Create a map of VIN codes to car data for quick lookup
      const vinCodeToCarData = new Map(
        cars.map((car) => [
          car.vinCode,
          {
            id: car.carID,
            toBePaid: car.toBePaid || 0,
            transportationPrice: car.transportationPrice || 0,
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
      const updates: { id: number; toBePaid: number }[] = [];
      const processedEntries: {
        entryId: number;
        amount: number;
        vinCode: string;
      }[] = [];

      if (statementData?.Records && Array.isArray(statementData.Records)) {
        for (const entry of statementData.Records) {
          // Skip if entry has already been processed (using in-memory Set)
          if (processedEntryIds.has(entry.EntryId)) {
            continue;
          }

          if (entry.EntryComment && entry.EntryAmount) {
            // Find matching car by VIN code in EntryComment
            for (const [vinCode, carData] of vinCodeToCarData.entries()) {
              if (entry.EntryComment.includes(vinCode)) {
                const toBePaid = carData.toBePaid - entry.EntryAmount;

                updates.push({
                  id: carData.id,
                  toBePaid: toBePaid,
                });

                processedEntries.push({
                  entryId: entry.EntryId,
                  amount: entry.EntryAmount,
                  vinCode,
                });

                break; // Found the matching car, no need to check other VIN codes
              }
            }
          }
        }
      }

      // First update cars in batches
      if (updates.length > 0) {
        // First, get current car data to calculate cost differences
        const carsToUpdate = await this.carModel
          .find(
            { carID: { $in: updates.map((u) => u.id) } },
            {
              username: 1,
              carID: 1,
              toBePaid: 1,
            },
          )
          .lean();

        // Calculate cost differences using current car data
        const userUpdates = new Map<string, number>();
        for (const car of carsToUpdate) {
          const update = updates.find((u) => u.id === car.carID);
          if (update) {
            const costDifference = update.toBePaid - car.toBePaid;

            if (costDifference !== 0) {
              userUpdates.set(car.username, (userUpdates.get(car.username) || 0) + costDifference);
            }
          }
        }

        // Update user balances first
        for (const [username, costDifference] of userUpdates.entries()) {
          try {
            const user = await this.usersService.findByUsername(username);

            await this.usersService.updateTotalBalance(user.userID, costDifference);
          } catch (error) {
            console.error(`Failed to update total balance for user ${username}:`, error);
            // Continue with other updates even if one fails
          }
        }

        // Then update cars in batches
        const batchSize = 100;
        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize);

          console.log('Batch:', batch);
          const bulkOps = batch.map((update) => {
            // Find the current car object for this update
            const car = cars.find((c) => c.carID === update.id);
            const currentToBePaid = car?.toBePaid || 0; // Get the current toBePaid value
            const diff = currentToBePaid - update.toBePaid; // Calculate the difference
            console.log('Diff:', diff);
            return {
              updateOne: {
                filter: { carID: update.id },
                update: {
                  $set: {
                    toBePaid: diff,
                  },
                },
              },
            };
          });

          await this.carModel.bulkWrite(bulkOps);
        }

        // Store processed entries in a single bulk insert
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
        }
      }
    } catch (error) {
      console.error('Error processing statement and updating cars:', error);
      throw new HttpException(
        'Failed to process statement and update cars',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStatement(
    accountNumber: string = 'GE40BG0000000498826082',
    currency: string = 'USD',
    startDate: string = '2025-05-01',
    endDate: string = '2025-05-30',
  ): Promise<StatementResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${BOG_API_CONFIG.statementEndpoint}/${accountNumber}/${currency}/${startDate}/${endDate}`;

      const response = await firstValueFrom(
        this.httpService.get<StatementResponse>(url, { headers }),
      );

      // Process the statement and update cars
      await this.processStatementAndUpdateCars(response.data);

      return response.data;
    } catch (error) {
      console.error('Error fetching statement:', error);
      throw new HttpException(
        'Failed to fetch statement from BOG API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
