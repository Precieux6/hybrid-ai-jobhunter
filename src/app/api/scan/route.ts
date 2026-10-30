import { NextResponse } from "next/server";
import { hybridQueue } from "@/services/queue";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedPlatform = body.platform || "all";

    let user = await prisma.users.findFirst();
    if (!user) {
      user = await prisma.users.create({
        data: {
          clerk_id: "user_portfolio_main",
          email: "contact@portfolio.fr",
          full_name: "Candidat Polyvalent",
          base_profile_text: `Profil polyvalent : Développeur Web (React, Node.js, Next.js, TypeScript), Rédacteur Web SEO (articles optimisés, copywriting percutant) et Community Manager (gestion des réseaux sociaux, stratégie d'engagement, création de contenu).`,
        },
      });
    }

    const keywords = [
      "developpeur web",
      "rédacteur web",
      "community manager",
    ];

    for (const keyword of keywords) {
      await hybridQueue.add("scrape-and-analyze", {
        keyword,
        location: "France",
        userId: user.id,
        platform: requestedPlatform,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Scan démarré sur ${requestedPlatform === "all" ? "les 4 réseaux (LinkedIn, Facebook, Instagram, Threads)" : requestedPlatform} !`,
      keywords,
    });
  } catch (error: any) {
    console.error("Erreur API POST /api/scan :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
