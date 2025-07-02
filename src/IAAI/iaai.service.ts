import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

@Injectable()
export class IaaIService {
  constructor(private readonly httpService: HttpService) {}

  async getCarDetailsByLot(lotNumber: string) {
    try {
      const url = `https://vis.iaai.com/Home/GetVehicleData?salvageId=${lotNumber}`;
      const response: AxiosResponse<string> = await lastValueFrom(
        this.httpService.get<string>(url, {
          responseType: 'text',
        }),
      );
      let extractedVin = '';
      let extractedLot = '';
      let extractedLocation = '';
      
      const responseData = JSON.parse(response.data) as Record<string, unknown>;
      const stockNumber = responseData.StockNumber;
      const vin = responseData.Vin;

      const url2 = `https://bid.cars/en/lot/0-${stockNumber}/${vin}`;

      // Use Playwright for bid.cars to avoid bot detection
      const bidCarsBrowser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
      });

      const bidCarsContext = await bidCarsBrowser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });

      const bidCarsPage = await bidCarsContext.newPage();
      bidCarsPage.setDefaultTimeout(20000);

      try {
        await bidCarsPage.goto(url2, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });

        // Get the HTML content
        const bidCarsHtml = await bidCarsPage.content();
        console.log("BID.CARS HTML LENGTH:", bidCarsHtml.length);

        // Parse the HTML response directly with cheerio
        const $ = cheerio.load(bidCarsHtml);
        
        // Extract meta description tag
        const metaDescription = $('meta[name="description"]').attr('content');
        console.log('Meta description:', metaDescription);
        
        // Extract VIN, Lot, and Location from meta description
        
        
        if (metaDescription) {
          // Extract VIN (after "VIN:" and before "Lot:")
          const vinMatch = metaDescription.match(/VIN:\s*([^\s]+)\s+Lot:/);
          if (vinMatch) {
            extractedVin = vinMatch[1].trim();
          }
          
          // Extract Lot (after "Lot:" and before the first comma)
          const lotMatch = metaDescription.match(/Lot:\s*([^,]+),/);
          if (lotMatch) {
            extractedLot = lotMatch[1].trim();
            // Remove "0-" prefix if it exists
            if (extractedLot.startsWith('0-')) {
              extractedLot = extractedLot.substring(2);
            }
          }
          
          // Extract Location (after "Location:" and before the first comma)
          const locationMatch = metaDescription.match(/Location:\s*([^,]+),/);
          if (locationMatch) {
            extractedLocation = locationMatch[1].trim();
          }
        }
        
        console.log('Extracted data:', {
          vin: extractedVin,
          lot: extractedLot, 
          location: extractedLocation
        });
    
      } finally {
        // Clean up browser resources
        await bidCarsPage.close();
        await bidCarsContext.close();
        await bidCarsBrowser.close();
      } 


      return {
        vin: extractedVin,
          lot: extractedLot, 
          location: extractedLocation
      };
    } catch (error) {
      console.error('Error fetching car details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch car details for lot ${lotNumber}: ${errorMessage}`);
    }
  }

 }
