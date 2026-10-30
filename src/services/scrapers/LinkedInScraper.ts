import { BaseScraper } from "./BaseScraper";

export class LinkedInScraper extends BaseScraper {
  override async scrapeTarget(profileUrl: string) {
    await this.initBrowser(true);
    try {
      if (!this.page) throw new Error("Page non initialisée");
      console.log(`[LinkedIn] Scraping de ${profileUrl}...`);
      await this.page.goto(profileUrl, { waitUntil: 'domcontentloaded' });
      await this.randomDelay();

      return {
        url: profileUrl,
      };
    } finally {
      await this.closeBrowser();
    }
  }

  async searchJobs(keyword: string, location: string = "France") {
    await this.initBrowser(false);
    
    try {
      if (!this.page) throw new Error("Page non initialisée");
      
      const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;
      console.log(`[LinkedIn] Recherche des offres : ${url}`);
      
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.randomDelay(3000, 5000);
      
      await this.page.mouse.wheel(0, 1000);
      await this.randomDelay(1000, 2000);

      const jobs = await this.page.evaluate(() => {
        const jobCards = Array.from(document.querySelectorAll('.base-search-card, .base-card'));
        return jobCards.slice(0, 5).map(card => {
          const titleEl = card.querySelector('.base-search-card__title');
          const companyEl = card.querySelector('.base-search-card__subtitle');
          const locationEl = card.querySelector('.job-search-card__location');
          const linkEl = card.querySelector('.base-card__full-link') as HTMLAnchorElement;
          
          return {
            title: titleEl?.textContent?.trim() || 'Inconnu',
            company: companyEl?.textContent?.trim() || 'Inconnu',
            location: locationEl?.textContent?.trim() || 'Inconnu',
            url: linkEl?.href || ''
          };
        });
      });

      console.log(`[LinkedIn] ${jobs.length} offres trouvées publiquement !`);
      return jobs.map((j: { title: string; company: string; location: string; url: string }) => ({
        ...j,
        description: `Offre d'emploi : ${j.title} chez ${j.company} (${j.location})`,
        source: 'LinkedIn' as const
      }));

    } finally {
      await this.closeBrowser();
    }
  }
}
