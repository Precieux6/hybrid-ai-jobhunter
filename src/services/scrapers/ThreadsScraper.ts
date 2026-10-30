import { BaseScraper } from "./BaseScraper";

export class ThreadsScraper extends BaseScraper {
  async searchOffers(keyword: string) {
    const cookies = [];
    if (process.env.IG_SESSIONID) {
      cookies.push(
        { name: 'sessionid', value: process.env.IG_SESSIONID, domain: '.threads.net', path: '/' }
      );
    }
    await this.initBrowser(false, cookies);
    try {
      if (!this.page) throw new Error("Page non initialisée");
      const url = `https://www.threads.net/search?q=${encodeURIComponent(keyword)}&serp_type=default`;
      console.log(`[Threads] Recherche des offres : ${url}`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.randomDelay(4000, 6000);

      const posts = await this.page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
        return elements
          .map(el => el.textContent?.trim() || '')
          .filter(text => text.length > 50)
          .slice(0, 3);
      });

      console.log(`[Threads] ${posts.length} posts trouvés.`);
      return posts.map((text: string, idx: number) => ({
        title: `Opportunité Threads #${idx + 1} (${keyword})`,
        company: 'Threads User / Post',
        location: 'Remote',
        url: url,
        description: text,
        source: 'Threads' as const
      }));
    } catch (error) {
      console.error("[Threads] Erreur :", error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  override async scrapeTarget(username: string) {
    await this.initBrowser();
    try {
      if (!this.page) throw new Error("Page non initialisée");
      const url = `https://www.threads.net/@${username}`;
      console.log(`[Threads] Scraping de ${url}...`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.randomDelay();

      const profileData = {
        name: username,
        bio: "Bio from Threads",
        network: "Threads",
        url,
      };

      return profileData;
    } finally {
      await this.closeBrowser();
    }
  }
}
