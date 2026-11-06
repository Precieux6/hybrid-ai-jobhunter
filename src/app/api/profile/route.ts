import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Erreur GET /api/profile :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { baseProfileText, fullName, email } = body;

    let user = await prisma.users.findFirst();
    if (!user) {
      user = await prisma.users.create({
        data: {
          clerk_id: "user_portfolio_main",
          email: email || "contact@portfolio.fr",
          full_name: fullName || "Candidat Polyvalent",
          base_profile_text: baseProfileText || "",
        },
      });
    } else {
      user = await prisma.users.update({
        where: { id: user.id },
        data: {
          base_profile_text: baseProfileText !== undefined ? baseProfileText : user.base_profile_text,
          full_name: fullName !== undefined ? fullName : user.full_name,
          email: email !== undefined ? email : user.email,
        },
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    console.error("Erreur POST /api/profile :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
