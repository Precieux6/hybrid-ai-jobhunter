import "dotenv/config";
import { hybridQueue } from "../services/queue";
import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function trigger() {
  console.log("--- Ajout des tâches de recherche dans la file d'attente (4 réseaux) ---");
  
  // Profil de l'utilisateur avec ses compétences réelles
  let user = await prisma.users.findFirst();
  if (!user) {
    user = await prisma.users.create({
      data: {
        clerk_id: "user_portfolio_main",
        email: "contact@portfolio.fr",
        full_name: "Candidat Polyvalent",
        base_profile_text: `Profil polyvalent : Développeur Web (React, Node.js, Next.js, TypeScript), Rédacteur Web SEO (rédaction d'articles optimisés, copywriting percutant) et Community Manager (gestion des réseaux sociaux, stratégie d'engagement, création de contenu).`
      }
    });
  }

  // Les 3 mots-clés demandés par l'utilisateur
  const keywords = [
    "developpeur web",
    "rédacteur web",
    "community manager"
  ];

  for (const keyword of keywords) {
    await hybridQueue.add('scrape-and-analyze', {
      keyword,
      location: "France",
      userId: user.id,
      platform: "all" // Scrape LinkedIn, Facebook, Instagram et Threads !
    });
    console.log(`🚀 Tâche ajoutée pour le mot-clé : "${keyword}" (sur LinkedIn, FB, Insta, Threads)`);
  }

  console.log("\n✅ Toutes les tâches sont envoyées à Redis ! Le Worker va tout traiter en continu.");
  process.exit(0);
}

trigger();
