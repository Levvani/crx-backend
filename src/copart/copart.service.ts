import { Injectable } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';

@Injectable()
export class CopartService {
  private browser: Browser | null = null;

  // Initialize browser when needed
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch();
    }
    return this.browser;
  }

  async getCarDetailsByLot(lotNumber: string) {
    let page: Page | null = null;
    try {
      const browser = await this.getBrowser();
      const context = await browser.newContext();
      page = await context.newPage();
      const url = `https://www.copart.com/public/data/lotdetails/solr/${lotNumber}`;
      await page.goto(url);
      // Wait for and extract the data
      const rawData = await page.getByText('{"returnCode":1,"').textContent();

      // Convert string to JSON
      let jsonData = null;
      if (rawData) {
        try {
          jsonData = JSON.parse(rawData) as Record<string, unknown>;
          console.log('Parsed JSON data type:', typeof jsonData);
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          // Try to extract valid JSON from the string if it contains extra text
          const jsonMatch = rawData.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              jsonData = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
              console.log('Extracted and parsed JSON data type:', typeof jsonData);
            } catch (extractError) {
              console.error('Error parsing extracted JSON:', extractError);
            }
          }
        }
      }

      // Clean up resources
      await page.close();
      await context.close();

      return jsonData as Record<string, unknown> | string; // Return typed JSON if parsing succeeded, otherwise return the raw string
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error fetching car details:', errorMessage);
      throw new Error(`Failed to fetch car details: ${errorMessage}`);
    } finally {
      if (page) {
        await page.close().catch(() => {});
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
}
