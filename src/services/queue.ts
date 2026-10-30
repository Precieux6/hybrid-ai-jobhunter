import { Queue, Worker, QueueEvents } from 'bullmq';
import connection from '../lib/redis';
import { AIService } from './ai';
import { prisma } from '../lib/prisma';

export const hybridQueue = new Queue('HybridSystemQueue', { connection });
export const queueEvents = new QueueEvents('HybridSystemQueue', { connection });

export const hybridWorker = new Worker(
  'HybridSystemQueue',
  async (job) => {
    console.log(`[Worker] Démarrage du job ${job.id} de type ${job.name}`);
    
    if (job.name === 'scrape-and-analyze') {
      const { keyword, location = "France", userId, platform = "all" } = job.data;
      console.log(`[Worker] Extraction demandée pour : "${keyword}" sur [${platform}]`);
      
      const user = await prisma.users.findUnique({ where: { id: userId } });
      if (!user) throw new Error("Utilisateur introuvable");

      const allOffers: Array<{
        title: string;
        company?: string;
        location?: string;
        url: string;
        description: string;
        source: string;
      }> = [];

      // 1. LinkedIn
      if (platform === 'all' || platform === 'LinkedIn') {
        try {
          const { LinkedInScraper } = await import('./scrapers/LinkedInScraper');
          const scraper = new LinkedInScraper();
          const liOffers = await scraper.searchJobs(keyword, location);
          allOffers.push(...liOffers);
        } catch (e) {
          console.error("[Worker] Erreur scraping LinkedIn:", e);
        }
      }

      // 2. Facebook
      if (platform === 'all' || platform === 'Facebook') {
        try {
          const { FacebookScraper } = await import('./scrapers/FacebookScraper');
          const scraper = new FacebookScraper();
          const fbOffers = await scraper.searchOffers(keyword);
          allOffers.push(...fbOffers);
        } catch (e) {
          console.error("[Worker] Erreur scraping Facebook:", e);
        }
      }

      // 3. Instagram
      if (platform === 'all' || platform === 'Instagram') {
        try {
          const { InstagramScraper } = await import('./scrapers/InstagramScraper');
          const scraper = new InstagramScraper();
          const igOffers = await scraper.searchOffers(keyword);
          allOffers.push(...igOffers);
        } catch (e) {
          console.error("[Worker] Erreur scraping Instagram:", e);
        }
      }

      // 4. Threads
      if (platform === 'all' || platform === 'Threads') {
        try {
          const { ThreadsScraper } = await import('./scrapers/ThreadsScraper');
          const scraper = new ThreadsScraper();
          const thOffers = await scraper.searchOffers(keyword);
          allOffers.push(...thOffers);
        } catch (e) {
          console.error("[Worker] Erreur scraping Threads:", e);
        }
      }

      console.log(`[Worker] Total de ${allOffers.length} opportunités collectées. Lancement des analyses IA...`);

      for (const offer of allOffers) {
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
              location: offer.location || location,
              description: offer.description,
              ai_match_score: aiResult.matchScore,
              ai_match_reasoning: aiResult.coverLetter,
            }
          });

          if (aiResult.markdownCv) {
            await prisma.deliverables.create({
              data: {
                target_id: target.id,
                user_id: user.id,
                type: "cv_markdown",
                content: aiResult.markdownCv
              }
            });
          }

          if (aiResult.coverLetter) {
            await prisma.deliverables.create({
              data: {
                target_id: target.id,
                user_id: user.id,
                type: "cover_letter",
                content: aiResult.coverLetter
              }
            });
          }

          console.log(`[Worker] ✅ Enregistré : "${offer.title}" (${offer.source}) - Score : ${aiResult.matchScore}/100`);
        } catch (aiErr) {
          console.error(`[Worker] Erreur analyse IA pour ${offer.title}:`, aiErr);
        }
      }

      console.log(`[Worker] 🎉 Traitement terminé pour le mot-clé "${keyword}".`);
    }
  },
  { connection }
);

hybridWorker.on('completed', (job) => console.log(`[Worker] Job ${job.id} complété avec succès !`));
hybridWorker.on('failed', (job, err) => console.error(`[Worker] Erreur job ${job?.id}:`, err));
