import "dotenv/config";
import { FacebookScraper } from "../services/scrapers/FacebookScraper";
import { InstagramScraper } from "../services/scrapers/InstagramScraper";

async function main() {
  console.log("=== Début du test de scraping META (Sans Session) ===");
  const keyword = "developpeur web";
  
  const fbScraper = new FacebookScraper();
  console.log("\n--- Test Facebook ---");
  const fbResults = await fbScraper.searchOffers(keyword);
  console.log("Résultats FB :", fbResults);

  const igScraper = new InstagramScraper();
  console.log("\n--- Test Instagram ---");
  const igResults = await igScraper.searchOffers(keyword);
  console.log("Résultats Insta :", igResults);
  
  console.log("\n=== Fin du test ===");
}

main();
