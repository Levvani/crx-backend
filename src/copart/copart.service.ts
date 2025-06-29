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
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--memory-pressure-off'
          ],
          // Add extra timeouts for Docker environment
          timeout: 60000, // 60 seconds timeout for browser launch
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
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        // Add viewport to simulate real browser
        viewport: { width: 1920, height: 1080 },
        // Add extra headers to avoid detection
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      page = await context.newPage();

      // Set longer timeouts for network requests
      page.setDefaultTimeout(60000); // 60 seconds
      page.setDefaultNavigationTimeout(60000); // 60 seconds

      const url = `https://www.copart.com/public/data/lotdetails/solr/${lotNumber}`;
      console.log(`🌐 Navigating to: ${url}`);

      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      // Check if the page loaded successfully
      if (!response) {
        throw new Error('Failed to load page - no response received');
      }

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      console.log('📄 Page loaded, extracting data...');

      // Wait for content to be available
      await page.waitForTimeout(2000);

      // Try multiple selectors to find the JSON data
      let rawData: string | null = null;
      
      try {
        // Try to get the JSON data from the page
        rawData = await page.getByText('{"returnCode":1,"').textContent();
      } catch (e) {
        console.log('Primary selector failed, trying alternative method...');
        // Alternative: get all text content and search for JSON
        const bodyText = await page.textContent('body');
        const jsonMatch = bodyText?.match(/\{"returnCode":1,[\s\S]*?\}/);
        if (jsonMatch) {
          rawData = jsonMatch[0];
        }
      }

      console.log(`📊 Raw data extracted: ${rawData ? 'success' : 'no data found'}`);

      if (!rawData) {
        throw new Error('No JSON data found on the page');
      }

      // Convert string to JSON
      let jsonData = null;
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
            throw new Error(`Failed to parse JSON data: ${extractError.message}`);
          }
        } else {
          throw new Error('Could not extract valid JSON from response');
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
      try {
        await this.browser.close();
        this.browser = null;
        console.log('🧹 Browser closed on application shutdown');
      } catch (error) {
        console.error('⚠️ Error closing browser on shutdown:', error);
      }
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
