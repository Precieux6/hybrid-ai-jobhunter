import { chromium } from "playwright-extra";
import type { Browser, BrowserContext, Page } from "playwright";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;

  async initBrowser(headless = true, cookies?: { name: string, value: string, domain: string, path?: string }[]) {
    this.browser = (await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    })) as unknown as Browser;

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    if (cookies && cookies.length > 0) {
      await this.context.addCookies(cookies);
      console.log(`[Scraper] ${cookies.length} cookies injectés avec succès.`);
    }

    this.page = await this.context.newPage();
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async randomDelay(min = 2000, max = 5000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async scrapeTarget(targetIdentifier: string): Promise<any> {
    return { target: targetIdentifier };
  }
}
