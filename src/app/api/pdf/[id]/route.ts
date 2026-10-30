import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { marked } from "marked";
import { chromium } from "playwright";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>CV - ${target.title || "Candidature"}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            line-height: 1.5;
            padding: 10px;
            font-size: 13px;
          }
          .header-banner {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .header-title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
          }
          .header-subtitle {
            font-size: 13px;
            color: #2563eb;
            font-weight: 600;
            margin-top: 4px;
          }
          .badge {
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
          }
          h1 {
            font-size: 18px;
            color: #0f172a;
            border-bottom: 1.5px solid #e2e8f0;
            padding-bottom: 4px;
            margin-top: 14px;
            margin-bottom: 8px;
          }
          h2 {
            font-size: 15px;
            color: #1e40af;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
            margin-top: 12px;
            margin-bottom: 6px;
          }
          h3 {
            font-size: 13px;
            color: #334155;
            margin-top: 8px;
            margin-bottom: 4px;
          }
          p {
            margin: 0 0 8px 0;
            color: #334155;
          }
          ul, ol {
            margin: 0 0 8px 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 4px;
          }
          strong {
            color: #0f172a;
          }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div>
            <div class="header-title">${target.users?.full_name || "Candidature Personnalisée"}</div>
            <div class="header-subtitle">Candidature sur-mesure pour : ${target.title || "Opportunité"}</div>
          </div>
          <div class="badge">Match IA : ${target.ai_match_score || 90}%</div>
        </div>
        <div class="cv-body">
          ${parsedHtml}
        </div>
        <div class="footer">
          Généré pour l'offre ${target.title} chez ${target.company_name} • Source: ${target.source}
        </div>
      </body>
      </html>
    `;

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "domcontentloaded" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        bottom: "12mm",
        left: "12mm",
        right: "12mm",
      },
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
  } catch (error: any) {
    console.error("Erreur génération PDF :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
