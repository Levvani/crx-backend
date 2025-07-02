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
      console.log(`🌐 Using Playwright to intercept network responses from: ${url}`);

      // Use Playwright to intercept network responses with anti-bot detection measures
      const browser = await chromium.launch({ 
        headless: true,
        args: [ 
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // This helps in Docker
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-blink-features=AutomationControlled', // Hide automation
          '--disable-features=VizDisplayCompositor',
          '--disable-ipc-flooding-protection',
        ],
      });
      
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
        },
      });
      
      const page = await context.newPage();
      
      // Hide webdriver properties to avoid bot detection
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        // Remove automation indicators
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        
        // Make chrome object look more realistic
        (window as any).chrome = {
          runtime: {},
          loadTimes: function() {},
          csi: function() {},
          app: {}
        };
        
        // Override permissions API
        const originalQuery = window.navigator.permissions.query;
        (window.navigator.permissions as any).query = (parameters: any) => originalQuery.call(window.navigator.permissions, parameters);
      });
      
      // Store intercepted responses
      const interceptedResponses = new Map<string, any>();
      
      // Set up network response interception
      page.on('response', async (response) => {
        const request = response.request();
        const requestUrl = request.url();
        
        // Skip the url2 endpoint and only capture responses from the main IAAI page
        if (requestUrl === url) {
          
          try {
            const responseBody = await response.body();
            const responseText = responseBody.toString();
            console.log("RESPONSE BODYY - ", responseText);
            
            
            console.log(`📡 Intercepted response from: ${requestUrl}`);
            console.log(`📊 Response status: ${response.status()}`);
            console.log(`📊 Response size: ${responseText.length} bytes`);
            
            interceptedResponses.set(requestUrl, {
              url: requestUrl,
              status: response.status(),
              headers: response.headers(),
              body: responseText,
              method: request.method(),
            });
          } catch (error) {
            console.error(`❌ Error intercepting response from ${requestUrl}:`, error);
          }
        }
      });
      
      // Add a small delay to look more human-like
      await page.waitForTimeout(1000 + Math.random() * 2000);
      
      // Navigate to the page and wait for network activity to complete
      const response = await page.goto(url, { 
        timeout: 30000,
        waitUntil: 'domcontentloaded'
      });
      
      console.log(`📊 Page response status: ${response?.status()}`);
      
      // Wait a bit more for any delayed API calls
      await page.waitForTimeout(3000);
      
      // Log all intercepted responses
      console.log(`📡 Total intercepted responses: ${interceptedResponses.size}`);
      for (const [url, responseData] of interceptedResponses) {
        console.log(`📡 Intercepted: ${url} (${responseData.status})`);
      }
      
      // Close browser
      await browser.close();

      // Since we're intercepting the main HTML page response, parse it directly
      if (interceptedResponses.size === 0) {
        throw new Error('No responses were intercepted from the main page');
      }

      // Get the main page HTML response
      const mainPageResponse = interceptedResponses.get(url);
      if (!mainPageResponse) {
        throw new Error('Main page response not found in intercepted responses');
      }

      console.log('📋 Parsing HTML response for ProductDetailsVM script');
      
      // Parse HTML to extract ProductDetailsVM script
      const $ = cheerio.load(mainPageResponse.body);
      const productDetailsScript = $('script#ProductDetailsVM');
      
      if (productDetailsScript.length === 0) {
        console.log('❌ ProductDetailsVM script tag not found');
        throw new Error('ProductDetailsVM script not found in page');
      }

      const scriptContent = productDetailsScript.html();
      if (!scriptContent) {
        console.log('❌ ProductDetailsVM script content is empty');
        throw new Error('ProductDetailsVM script content is empty');
      }

      console.log(`📋 ProductDetailsVM script content length: ${scriptContent.length}`);
      console.log(`📋 ProductDetailsVM content preview: ${scriptContent.substring(0, 200)}...`);

      let productDetailsData;
      try {
        // Parse the JSON content
        productDetailsData = JSON.parse(scriptContent.trim());
        console.log('✅ Successfully parsed ProductDetailsVM JSON');
      } catch (parseError) {
        console.error('❌ Error parsing ProductDetailsVM JSON:', parseError);
        throw new Error(`Failed to parse ProductDetailsVM JSON: ${parseError.message}`);
      }

      // Extract the required fields
      if (!productDetailsData.inventoryView) {
        console.error('❌ inventoryView not found in ProductDetailsVM');
        console.log('📋 Available keys:', Object.keys(productDetailsData));
        throw new Error('InventoryView data not found in ProductDetailsVM');
      }

      if (!productDetailsData.inventoryView.attributes) {
        console.error('❌ inventoryView.attributes not found');
        console.log('📋 Available inventoryView keys:', Object.keys(productDetailsData.inventoryView));
        throw new Error('Attributes data not found in InventoryView');
      }

      const location = productDetailsData.inventoryView.attributes.BranchName;
      const carName = productDetailsData.inventoryView.attributes.YearMakeModelSeries;
      const vin = responseData2.Vin;

      console.log('✅ Successfully extracted vehicle data');
      
      return {
        location,
        carName,
        vin
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in getDetailsBySalvageId:', errorMessage);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`Failed to fetch details for salvage ID ${salvageId}: ${errorMessage}`);
    }
  }
}
