import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const targets = await prisma.targets.findMany({
      orderBy: { created_at: "desc" },
      include: {
        deliverables: true,
      },
      take: 50,
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
    const { id, status } = body;

    const updated = await prisma.targets.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erreur API PATCH /api/targets :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
