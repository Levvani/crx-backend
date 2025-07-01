import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';

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
      const responseData = JSON.parse(response.data) as Record<string, unknown>;

      return {
        data: responseData,
      };
    } catch (error) {
      console.error('Error fetching car details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch car details for lot ${lotNumber}: ${errorMessage}`);
    }
  }

  async getDetailsBySalvageId(salvageId: string) {
    try {
      console.log(`🔍 Fetching details for salvage ID: ${salvageId}`);

      const url = `https://www.iaai.com/VehicleDetail/${salvageId}~US`;
      console.log(`🌐 Making HTTP request to: ${url}`);

      // Make HTTP request to get the HTML content
      const response: AxiosResponse<string> = await lastValueFrom(
        this.httpService.get<string>(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          responseType: 'text',
          timeout: 30000,
        }),
      );

      console.log(`📊 Response status: ${response.status}`);
      console.log(`📊 Response content length: ${response.data.length}`);

      // Parse HTML with Cheerio
      const $ = cheerio.load(response.data);
      
      // Extract page title
      const pageTitle = $('title').text().trim();
      console.log(`📊 Page title: "${pageTitle}"`);

      // Look for the ProductDetailsVM script tag
      const productDetailsScript = $('script#ProductDetailsVM');
      console.log(`📋 ProductDetailsVM script found: ${productDetailsScript.length > 0}`);

      let extractedData: {
        title: string;
        url: string;
        contentLength: number;
        vehicleData: any;
        productDetails: any;
        salvageId: string;
        extractedAt: string;
        extractionError?: string;
      } = {
        title: pageTitle,
        url,
        contentLength: response.data.length,
        vehicleData: null,
        productDetails: null,
        salvageId: salvageId,
        extractedAt: new Date().toISOString()
      };

      if (productDetailsScript.length > 0) {
        const scriptContent = productDetailsScript.html();
        console.log(`📋 ProductDetailsVM script content length: ${scriptContent?.length || 0}`);
        console.log(`📋 ProductDetailsVM content preview: ${scriptContent?.substring(0, 200)}...`);

        if (scriptContent) {
          try {
            // Parse the JSON content
            const jsonData = JSON.parse(scriptContent.trim());
            extractedData.productDetails = jsonData;
            console.log('✅ Successfully parsed ProductDetailsVM JSON');
          } catch (parseError) {
            console.error('❌ Error parsing ProductDetailsVM JSON:', parseError);
            extractedData.extractionError = `JSON parse error: ${parseError.message}`;
            extractedData.productDetails = { rawContent: scriptContent };
          }
        }
      } else {
        console.log('❌ ProductDetailsVM script tag not found');
        
        // Check if any script tags exist
        const allScripts = $('script');
        console.log(`📋 Total script tags found: ${allScripts.length}`);
        
        // Look for any scripts containing "ProductDetails" or similar
        let foundSimilar = false;
        allScripts.each((index, element) => {
          const scriptId = $(element).attr('id');
          const scriptContent = $(element).html();
          
          if (scriptId) {
            console.log(`📋 Script tag found with id: ${scriptId}`);
          }
          
          if (scriptContent && scriptContent.includes('ProductDetails')) {
            console.log(`📋 Found script containing "ProductDetails" at index ${index}`);
            console.log(`📋 Content preview: ${scriptContent.substring(0, 200)}...`);
            foundSimilar = true;
          }
        });
        
        if (!foundSimilar) {
          console.log('📋 No scripts containing "ProductDetails" found');
        }
      }

      // Also extract basic vehicle info from HTML
      const stockNumber = $('.data-list__item').filter((i, el) => $(el).text().includes('Stock#')).text().match(/Stock#:\s*(\d+)/)?.[1];
      const vin = $('.data-list__item').filter((i, el) => $(el).text().includes('VIN')).text().match(/VIN:\s*([A-HJ-NPR-Z0-9*]+)/)?.[1];
      
      if (stockNumber || vin) {
        extractedData.vehicleData = {
          stockNumber: stockNumber || null,
          vin: vin || null,
        };
        console.log('✅ Extracted basic vehicle data from HTML');
      }

      console.log("PROSTA RESPONSE - ", extractedData);

      return {
        data: extractedData.productDetails.inventoryView.attributes.BranchName
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in getDetailsBySalvageId:', errorMessage);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`Failed to fetch details for salvage ID ${salvageId}: ${errorMessage}`);
    }
  }
}
