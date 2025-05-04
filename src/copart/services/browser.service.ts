import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Browser, chromium } from "playwright";

@Injectable()
export class BrowserService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;

  async onModuleInit() {
    this.browser = await chromium.launch({
      headless: true, // Set to false for debugging
    });
    console.log("Browser service initialized");
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      console.log("Browser service closed");
    }
  }

  getBrowser(): Browser {
    return this.browser;
  }

  async createPage() {
    const context = await this.browser.newContext();
    return context.newPage();
  }
}
