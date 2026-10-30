import { BaseScraper } from "./BaseScraper";

export class FacebookScraper extends BaseScraper {
  async searchOffers(keyword: string) {
    const cookies = [];
    if (process.env.FB_C_USER && process.env.FB_XS) {
      cookies.push(
        { name: 'c_user', value: process.env.FB_C_USER, domain: '.facebook.com', path: '/' },
        { name: 'xs', value: process.env.FB_XS, domain: '.facebook.com', path: '/' }
      );
    }
    
    await this.initBrowser(false, cookies);
    try {
      if (!this.page) throw new Error("Page non initialisée");
      
      const url = `https://www.facebook.com/search/posts/?q=${encodeURIComponent(keyword)}`;
      console.log(`[Facebook] Recherche des offres : ${url}`);
      
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.randomDelay(4000, 6000);
      
      const posts = await this.page.evaluate(() => {
        const postElements = Array.from(document.querySelectorAll('div[dir="auto"]'));
        return postElements
          .map(el => el.textContent?.trim() || '')
          .filter(text => text.length > 50)
          .slice(0, 3);
      });

      console.log(`[Facebook] ${posts.length} posts trouvés.`);
      return posts.map((text: string, idx: number) => ({
        title: `Opportunité Facebook #${idx + 1} (${keyword})`,
        company: 'Post Facebook / Groupe',
        location: 'France / Remote',
        url: url,
        description: text,
        source: 'Facebook' as const
      }));

    } catch (error) {
      console.error("[Facebook] Erreur :", error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }
}
