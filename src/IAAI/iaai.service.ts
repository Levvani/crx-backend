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
      const url2 = `https://vis.iaai.com/Home/GetVehicleData?salvageId=${salvageId}`;
      const response2: AxiosResponse<string> = await lastValueFrom(
        this.httpService.get<string>(url2, {
          responseType: 'text',
        }),
      );
      const responseData2 = JSON.parse(response2.data) as Record<string, unknown>;
      console.log("PROSTA RESPONSE - ", responseData2);

      console.log(`🔍 Fetching details for salvage ID: ${salvageId}`);

      const url = `https://www.iaai.com/VehicleDetail/${salvageId}~US`;
      console.log(`🌐 Using Playwright to fetch: ${url}`);

       // Use Playwright to get the HTML content (bypasses bot detection)
       const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
      });
      
      const page = await context.newPage();
      
      // Navigate to the page
      const response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      console.log(`📊 Response status: ${response?.status()}`);
      
      // Get the HTML content
      const htmlContent = await page.content();
      console.log(`📊 Response content length: ${htmlContent.length}`);
      
      // Close browser
      await browser.close();

      // Parse HTML with Cheerio
      const $ = cheerio.load(htmlContent);
      
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
        contentLength: htmlContent.length,
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
      // Add null checks before accessing nested properties
      if (!extractedData.productDetails) {
        console.error('❌ productDetails is null or undefined');
        throw new Error('ProductDetails data not found in response');
      }

      if (!extractedData.productDetails.inventoryView) {
        console.error('❌ inventoryView is null or undefined');
        console.log('📋 Available productDetails keys:', Object.keys(extractedData.productDetails));
        throw new Error('InventoryView data not found in ProductDetails');
      }

      if (!extractedData.productDetails.inventoryView.attributes) {
        console.error('❌ inventoryView.attributes is null or undefined');
        console.log('📋 Available inventoryView keys:', Object.keys(extractedData.productDetails.inventoryView));
        throw new Error('Attributes data not found in InventoryView');
      }
      return {
        location: extractedData.productDetails.inventoryView.attributes.BranchName,
        carName: extractedData.productDetails.inventoryView.attributes.YearMakeModelSeries,
        vin: responseData2.Vin
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in getDetailsBySalvageId:', errorMessage);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`Failed to fetch details for salvage ID ${salvageId}: ${errorMessage}`);
    }
  }
}
