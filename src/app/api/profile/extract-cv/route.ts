import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY non configurée" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      // Extraction directe par Gemini via PDF inline
      const base64Data = buffer.toString("base64");
      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: "application/pdf",
          },
        },
        `Tu es un expert en recrutement. Analyse ce CV et retranscris de manière exhaustive et fidèle tout le profil du candidat :
- Identité et titre professionnel
- Biographie / Résumé
- Compétences techniques & humaines détaillées
- Expériences professionnelles (postes, entreprises, missions, réalisations)
- Formations et diplômes
- Langues et centres d'intérêt

Rédige ce profil de référence sous forme de texte clair et structuré en Markdown. Conserve tous les détails concrets sans les abréger car ce profil servira de modèle de base à une IA.`
      ]);
      extractedText = result.response.text();
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      // Extraction Word via mammoth puis nettoyage par Gemini
      const docxResult = await mammoth.extractRawText({ buffer });
      const rawText = docxResult.value;

      const result = await model.generateContent(`
Tu es un expert en recrutement. Voici le texte brut extrait d'un CV au format Word :
<TEXTE_BRUT>
${rawText}
</TEXTE_BRUT>

Structure et enrichis ce texte pour en faire un profil de référence complet en Markdown (Expériences, Compétences, Projets, Formations). Ne supprime aucun détail pertinent.
      `);
      extractedText = result.response.text();
    } else {
      // Fichier texte simple
      const rawText = buffer.toString("utf-8");
      const result = await model.generateContent(`
Structure ce CV brut sous forme de profil complet et professionnel en Markdown :
${rawText}
      `);
      extractedText = result.response.text();
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      extractedText,
    });
  } catch (error: any) {
    console.error("Erreur extraction CV :", error);
    return NextResponse.json({ error: error.message || "Erreur lors de l'analyse du fichier" }, { status: 500 });
  }
}
