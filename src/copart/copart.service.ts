import { Injectable } from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

@Injectable()
export class CopartService {
  private browser: Browser | null = null;

  // Initialize browser with Docker-friendly settings
  private async getBrowser(): Promise<Browser> {
    // Always create a fresh browser for each request to avoid state issues
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('⚠️ Error closing existing browser:', error);
      }
      this.browser = null;
    }

    console.log('🔍 Creating fresh browser instance...');
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
        ],
      });
      console.log('✅ Fresh browser instance created successfully');
      return this.browser;
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  async getCarDetailsByLot(lotNumber: string) {
    let page: Page | null = null;
    let context: BrowserContext | null = null;
    let browser: Browser | null = null;

    try {
      console.log(`🔍 Fetching car details for lot: ${lotNumber}`);

      // Get a fresh browser instance for each request
      browser = await this.getBrowser();

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
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });

      page = await context.newPage();

      // Set shorter timeouts for faster failure detection
      page.setDefaultTimeout(20000); // 20 seconds

      const url = `https://www.copart.com/public/data/lotdetails/solr/${lotNumber}`;
      console.log(`🌐 Navigating to: ${url}`);

      await page.goto(url, {
        waitUntil: 'domcontentloaded', // Changed from 'networkidle' for faster loading
        timeout: 20000,
      });

      // Check if the page loaded successfully
      if (!response) {
        throw new Error('Failed to load page - no response received');
      }

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
      }

      console.log('📄 Page loaded, extracting data...');

      // Wait for and extract the data
      const rawData = await page.getByText('{"returnCode":1,"').textContent({ timeout: 10000 });

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
      // CRITICAL: Aggressive cleanup to prevent resource leaks
      console.log('🧹 Starting resource cleanup...');

      if (page) {
        try {
          await page.close();
          console.log('✅ Page closed successfully');
        } catch (closeError) {
          console.error('⚠️ Error closing page:', closeError);
        }
      }

      if (context) {
        try {
          await context.close();
          console.log('✅ Context closed successfully');
        } catch (closeError) {
          console.error('⚠️ Error closing context:', closeError);
        }
      }

      if (browser) {
        try {
          await browser.close();
          console.log('✅ Browser closed successfully');
        } catch (closeError) {
          console.error('⚠️ Error closing browser:', closeError);
        }
      }

      // Reset the browser reference
      this.browser = null;
      console.log('🧹 Resource cleanup completed');

      // Force garbage collection if available (Node.js with --expose-gc flag)
      if (global.gc) {
        global.gc();
        console.log('🗑️ Forced garbage collection');
      }

      // Small delay to ensure cleanup is complete
      await new Promise((resolve) => setTimeout(resolve, 100));
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
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Error during shutdown cleanup:', error);
      }
      this.browser = null;
    }
  }

  // Health check method to test browser initialization
  async testBrowserConnection(): Promise<boolean> {
    let testBrowser: Browser | null = null;
    try {
      console.log('🔍 Testing browser connection...');
      testBrowser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      console.log('✅ Browser connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Browser connection test failed:', error);
      return false;
    } finally {
      if (testBrowser) {
        try {
          await testBrowser.close();
        } catch (closeError) {
          console.error('Error closing test browser:', closeError);
        }
      }
    }
  }
}
