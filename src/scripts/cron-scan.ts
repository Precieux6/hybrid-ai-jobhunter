import "dotenv/config";
import { LinkedInScraper } from "../services/scrapers/LinkedInScraper";
import { FacebookScraper } from "../services/scrapers/FacebookScraper";
import { InstagramScraper } from "../services/scrapers/InstagramScraper";
import { ThreadsScraper } from "../services/scrapers/ThreadsScraper";
import { AIService } from "../services/ai";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("==================================================");
  console.log("🚀 Démarrage du scan automatique (GitHub Actions)");
  console.log("==================================================\n");

  let user = await prisma.users.findFirst();
  if (!user) {
    user = await prisma.users.create({
      data: {
        clerk_id: "user_portfolio_main",
        email: "contact@portfolio.fr",
        full_name: "Candidat Polyvalent",
        base_profile_text: `Profil polyvalent : Développeur Web (React, Node.js, Next.js, TypeScript), Rédacteur Web SEO (rédaction optimisée, copywriting) et Community Manager (gestion des réseaux sociaux, création de contenu, engagement).`,
      },
    });
  }

  const keywords = [
    "developpeur web",
    "rédacteur web",
    "community manager",
  ];

  let totalCollected = 0;
  let totalSaved = 0;

  for (const keyword of keywords) {
    console.log(`\n🔍 Recherche pour : "${keyword}"...`);
    const offers: Array<{
      title: string;
      company?: string;
      location?: string;
      url: string;
      description: string;
      source: string;
    }> = [];

    // 1. LinkedIn
    try {
      const scraper = new LinkedInScraper();
      const li = await scraper.searchJobs(keyword, "France");
      offers.push(...li);
    } catch (e) {
      console.error(`[LinkedIn] Erreur sur "${keyword}":`, e);
    }

    // 2. Facebook
    try {
      const scraper = new FacebookScraper();
      const fb = await scraper.searchOffers(keyword);
      offers.push(...fb);
    } catch (e) {
      console.error(`[Facebook] Erreur sur "${keyword}":`, e);
    }

    // 3. Instagram
    try {
      const scraper = new InstagramScraper();
      const ig = await scraper.searchOffers(keyword);
      offers.push(...ig);
    } catch (e) {
      console.error(`[Instagram] Erreur sur "${keyword}":`, e);
    }

    // 4. Threads
    try {
      const scraper = new ThreadsScraper();
      const th = await scraper.searchOffers(keyword);
      offers.push(...th);
    } catch (e) {
      console.error(`[Threads] Erreur sur "${keyword}":`, e);
    }

    console.log(`📊 ${offers.length} opportunités collectées pour "${keyword}".`);
    totalCollected += offers.length;

    // Analyse IA et enregistrement
    for (const offer of offers) {
      try {
        const aiResult = await AIService.generateApplication(
          user.base_profile_text,
          offer.description || offer.title
        );

        const target = await prisma.targets.create({
          data: {
            user_id: user.id,
            type: "job",
            status: "pending_review",
            source: offer.source,
            external_url: offer.url,
            title: offer.title,
            company_name: offer.company || "Non spécifié",
            location: offer.location || "France / Remote",
            description: offer.description,
            ai_match_score: aiResult.matchScore,
            ai_match_reasoning: aiResult.coverLetter,
          },
        });

        if (aiResult.markdownCv) {
          await prisma.deliverables.create({
            data: {
              target_id: target.id,
              user_id: user.id,
              type: "cv_markdown",
              content: aiResult.markdownCv,
            },
          });
        }

        if (aiResult.coverLetter) {
          await prisma.deliverables.create({
            data: {
              target_id: target.id,
              user_id: user.id,
              type: "cover_letter",
              content: aiResult.coverLetter,
            },
          });
        }

        totalSaved++;
        console.log(`✅ [${offer.source}] Enregistré : "${offer.title}" (Score IA : ${aiResult.matchScore}%)`);
      } catch (err) {
        console.error(`❌ Erreur analyse/sauvegarde "${offer.title}":`, err);
      }
    }
  }

  console.log("\n==================================================");
  console.log(`🎉 Fin du scan ! Total collecté : ${totalCollected} | Total traité & sauvegardé : ${totalSaved}`);
  console.log("==================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erreur critique script de scan :", err);
  process.exit(1);
});
