import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const targets = await prisma.targets.findMany({
      orderBy: { created_at: "desc" },
      include: {
        deliverables: true,
      },
      take: 60,
    });
    return NextResponse.json(targets);
  } catch (error: any) {
    console.error("Erreur API GET /api/targets :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, coverLetter, markdownCv } = body;

    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (status !== undefined) dataToUpdate.status = status;
    if (coverLetter !== undefined) dataToUpdate.ai_match_reasoning = coverLetter;

    const updated = await prisma.targets.update({
      where: { id },
      data: dataToUpdate,
    });

    // Mise à jour ou création de l'accroche dans deliverables
    if (coverLetter !== undefined) {
      const existingLetter = await prisma.deliverables.findFirst({
        where: { target_id: id, type: "cover_letter" },
      });

      if (existingLetter) {
        await prisma.deliverables.update({
          where: { id: existingLetter.id },
          data: { content: coverLetter, is_human_edited: true },
        });
      } else {
        await prisma.deliverables.create({
          data: {
            target_id: id,
            user_id: updated.user_id,
            type: "cover_letter",
            content: coverLetter,
            is_human_edited: true,
          },
        });
      }
    }

    // Mise à jour ou création du CV Markdown dans deliverables
    if (markdownCv !== undefined) {
      const existingCv = await prisma.deliverables.findFirst({
        where: { target_id: id, type: "cv_markdown" },
      });

      if (existingCv) {
        await prisma.deliverables.update({
          where: { id: existingCv.id },
          data: { content: markdownCv, is_human_edited: true },
        });
      } else {
        await prisma.deliverables.create({
          data: {
            target_id: id,
            user_id: updated.user_id,
            type: "cv_markdown",
            content: markdownCv,
            is_human_edited: true,
          },
        });
      }
    }

    return NextResponse.json({ success: true, target: updated });
  } catch (error: any) {
    console.error("Erreur API PATCH /api/targets :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
