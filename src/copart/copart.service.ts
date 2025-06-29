import { Injectable } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

@Injectable()
export class CopartService {
  private browser: Browser | null = null;

  // Initialize browser with Docker-friendly settings
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      console.log('🔍 Initializing Playwright browser...');
      try {
        this.browser = await chromium.launch({
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
          ],
        });
        console.log('✅ Browser initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize browser:', error);
        throw error;
      }
    }
    return this.browser;
  }

  async getCarDetailsByLot(lotNumber: string) {
    let page: Page | null = null;
    let context: BrowserContext | null = null;

    try {
      console.log(`🔍 Fetching car details for lot: ${lotNumber}`);

      const browser = await this.getBrowser();
      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      });

      page = await context.newPage();

      // Set timeouts
      page.setDefaultTimeout(30000); // 30 seconds

      const url = `https://www.copart.com/public/data/lotdetails/solr/${lotNumber}`;
      console.log(`🌐 Navigating to: ${url}`);

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      console.log('📄 Page loaded, extracting data...');

      // Wait for and extract the data
      const rawData = await page.getByText('{"returnCode":1,"').textContent();

      console.log(`📊 Raw data extracted: ${rawData ? 'success' : 'no data found'}`);

      // Convert string to JSON
      let jsonData = null;
      if (rawData) {
        try {
          jsonData = JSON.parse(rawData) as Record<string, unknown>;
          console.log('✅ JSON parsed successfully');
        } catch (parseError) {
          console.error('❌ Error parsing JSON:', parseError);
          // Try to extract valid JSON from the string if it contains extra text
          const jsonMatch = rawData.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              jsonData = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
              console.log('✅ JSON extracted and parsed successfully');
            } catch (extractError) {
              console.error('❌ Error parsing extracted JSON:', extractError);
            }
          }
        }
      }

      console.log(`🎯 Final result: ${jsonData ? 'data found' : 'no data'}`);
      return jsonData as Record<string, unknown> | string;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Error in getCarDetailsByLot:', errorMessage);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`Failed to fetch car details: ${errorMessage}`);
    } finally {
      // Clean up resources
      if (page) {
        try {
          await page.close();
          console.log('🧹 Page closed');
        } catch (closeError) {
          console.error('⚠️ Error closing page:', closeError);
        }
      }
      if (context) {
        try {
          await context.close();
          console.log('🧹 Context closed');
        } catch (closeError) {
          console.error('⚠️ Error closing context:', closeError);
        }
      }
    }
  }

  // Add a cleanup method to be called when the application shuts down
  async onApplicationShutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Health check method to test browser initialization
  async testBrowserConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing browser connection...');
      await this.getBrowser();
      console.log('✅ Browser connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Browser connection test failed:', error);
      return false;
    }
  }
}
