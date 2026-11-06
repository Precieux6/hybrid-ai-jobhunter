import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { marked } from "marked";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const target = await prisma.targets.findUnique({
      where: { id },
      include: {
        deliverables: true,
        users: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: "Opportunité non trouvée" }, { status: 404 });
    }

    const cvDeliverable = target.deliverables.find(
      (d: any) => d.type === "cv_markdown"
    );

    const cvMarkdown =
      cvDeliverable?.content ||
      `# CV de Candidature\n\n**Poste visé :** ${target.title}\n**Entreprise :** ${target.company_name}\n\n## Profil\n${target.users?.base_profile_text || ""}`;

    const parsedHtml = await marked.parse(cvMarkdown);

    // Tentative de génération via Playwright si disponible (local/serveur)
    try {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>CV - ${target.title || "Candidature"}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 10px; font-size: 13px; }
            .header-banner { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            .header-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
            .header-subtitle { font-size: 13px; color: #2563eb; font-weight: 600; margin-top: 4px; }
            .badge { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
            h1 { font-size: 18px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 14px; }
            h2 { font-size: 14px; color: #1e40af; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <div class="header-title">${target.users?.full_name || "Candidat"}</div>
              <div class="header-subtitle">Candidature pour : ${target.title} (${target.company_name})</div>
            </div>
            <div class="badge">Match IA : ${target.ai_match_score || 90}%</div>
          </div>
          <div>${parsedHtml}</div>
        </body>
        </html>
      `;

      await page.setContent(fullHtml, { waitUntil: "domcontentloaded" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
      });

      await browser.close();

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="CV_${encodeURIComponent(
            target.company_name || "Candidature"
          )}.pdf"`,
        },
      });
    } catch (playwrightError) {
      // En environnement Serverless (Vercel) sans chromium binaire, redirection transparente vers la vue A4 print
      return NextResponse.redirect(new URL(`/cv/${id}?print=true`, request.url));
    }
  } catch (error: any) {
    console.error("Erreur route PDF :", error);
    return NextResponse.redirect(new URL(`/cv/${id}?print=true`, request.url));
  }
}
