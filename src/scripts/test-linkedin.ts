import { LinkedInScraper } from "../services/scrapers/LinkedInScraper";

async function main() {
  console.log("=== Début du test de scraping LinkedIn (Sans Session) ===");
  const scraper = new LinkedInScraper();
  
  try {
    const jobs = await scraper.searchJobs("développeur react", "France");
    console.log(JSON.stringify(jobs, null, 2));
  } catch (error) {
    console.error("Erreur lors du test :", error);
  }
}

main();
