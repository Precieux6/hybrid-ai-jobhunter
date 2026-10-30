import { BaseScraper } from "./BaseScraper";

export class InstagramScraper extends BaseScraper {
  async searchOffers(keyword: string) {
    const cookies = [];
    if (process.env.IG_SESSIONID) {
      cookies.push(
        { name: 'sessionid', value: process.env.IG_SESSIONID, domain: '.instagram.com', path: '/' }
      );
    }
    await this.initBrowser(false, cookies);
    try {
      if (!this.page) throw new Error("Page non initialisée");
      
      const hashtag = keyword.replace(/\s+/g, '').toLowerCase();
      const url = `https://www.instagram.com/explore/tags/${hashtag}/`;
      
      console.log(`[Instagram] Recherche via hashtag : ${url}`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.randomDelay(4000, 6000);

      const isLoginBlocked = await this.page.evaluate(() => {
        return document.body.innerHTML.includes('Connectez-vous pour continuer') || 
               document.body.innerHTML.includes('Log In');
      });

      if (isLoginBlocked) {
         console.log(`[Instagram] ⚠️ Bloqué par la page de connexion obligatoire.`);
         return [];
      }

      const posts = await this.page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href^="/p/"]'));
        return links.map((a: any) => "https://www.instagram.com" + a.getAttribute('href')).slice(0, 3);
      });

      console.log(`[Instagram] ${posts.length} liens de posts trouvés.`);
      return posts.map((link: string, idx: number) => ({
        title: `Publication Instagram #${idx + 1} (#${hashtag})`,
        company: 'Compte Instagram',
        location: 'Remote / France',
        url: link,
        description: `Opportunité repérée sur Instagram pour #${hashtag}`,
        source: 'Instagram' as const
      }));

    } catch (error) {
      console.error("[Instagram] Erreur :", error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }
}
