import "dotenv/config";
import { hybridWorker, hybridQueue } from "./services/queue";
import { prisma } from "./lib/prisma";

console.log("🚀 Worker BullMQ démarré. En attente de tâches (Scraping, IA, DB)...");

export async function runScheduledScan() {
  try {
    let user = await prisma.users.findFirst();
    if (!user) {
      user = await prisma.users.create({
        data: {
          clerk_id: "user_portfolio_main",
          email: "contact@portfolio.fr",
          full_name: "Candidat Polyvalent",
          base_profile_text: `Profil polyvalent : Développeur Web, Rédacteur Web SEO et Community Manager.`,
        },
      });
    }

    const keywords = ["developpeur web", "rédacteur web", "community manager"];
    console.log(`⏰ [Scheduler] Lancement automatique du scan pour les 3 métiers sur les 4 réseaux...`);

    for (const keyword of keywords) {
      await hybridQueue.add("scrape-and-analyze", {
        keyword,
        location: "France",
        userId: user.id,
        platform: "all",
      });
    }
    console.log(`✅ [Scheduler] Tâches planifiées envoyées à Redis avec succès !`);
  } catch (err) {
    console.error("Erreur planificateur automatique :", err);
  }
}

// Vérification périodique pour déclencher automatiquement à 08h00, 12h00 et 17h00
let lastTriggeredHour = -1;
setInterval(() => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if ([8, 12, 17].includes(currentHour) && currentMinute === 0 && lastTriggeredHour !== currentHour) {
    lastTriggeredHour = currentHour;
    runScheduledScan();
  }
}, 60 * 1000);

console.log("⏰ Planificateur automatique activé (Scans quotidiens programmés à 08h00, 12h00 et 17h00).");

// Maintenir le processus en vie
process.on("SIGINT", async () => {
  console.log("Fermeture du worker...");
  await hybridWorker.close();
  process.exit(0);
});
