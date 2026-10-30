import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export class AIService {
  /**
   * Analyse une offre d'emploi et le CV de l'utilisateur pour générer un score de pertinence,
   * un CV adapté en Markdown et un message d'accroche.
   */
  static async generateApplication(baseCvText: string, jobDescription: string) {
    // Le modèle Gemini 1.5 Pro est parfaitement adapté pour les longs contextes et le raisonnement complexe
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    const prompt = `
Tu es un expert en recrutement B2B et en rédaction de CV.
Voici le CV de base d'un candidat :
<CV>
${baseCvText}
</CV>

Voici une offre d'emploi :
<OFFRE>
${jobDescription}
</OFFRE>

Ta mission est de :
1. Calculer un score de matching (sur 100) basé sur l'adéquation entre le CV et l'offre.
2. Rédiger un CV sur-mesure au format Markdown qui met en valeur les expériences pertinentes pour l'offre.
3. Rédiger un message d'accroche (lettre de motivation / email) hyper-personnalisé, court et percutant.

Réponds au format JSON avec la structure suivante :
{
  "matchScore": number,
  "markdownCv": "string (CV complet en Markdown)",
  "coverLetter": "string (Message d'accroche)"
}
`;

    try {
      console.log("🧠 Analyse en cours par Gemini 3.8 Flash...");
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Nettoyage éventuel si le modèle renvoie le JSON dans des blocs markdown
      text = text.replace(/```json/g, "").replace(/```/g, "");
      
      return JSON.parse(text);
    } catch (error) {
      console.error("❌ Erreur de génération avec Gemini :", error);
      throw error;
    }
  }

  /**
   * Module 2 : Audit de profil B2B et génération d'une accroche ultra-personnalisée.
   */
  static async auditProfileAndGenerateOffer(profileData: any, network: string, myOffer: string) {
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    const prompt = `
Tu es un expert en "Social Selling" et "Cold DM" sur ${network}.
Voici les données extraites du profil d'un prospect :
<PROFIL>
${JSON.stringify(profileData, null, 2)}
</PROFIL>

Et voici ce que moi je propose (mon offre / mon service) :
<MON_OFFRE>
${myOffer}
</MON_OFFRE>

Ta mission est de :
1. Auditer le profil pour trouver une "faille" ou un point d'accroche pertinent.
2. Générer un score de pertinence (0-100) mesurant à quel point ma solution peut l'aider.
3. Rédiger un message d'approche (DM) très naturel, court, adapté aux codes de ${network}, et non vendeur (approche consultative).

Réponds au format JSON avec la structure suivante :
{
  "auditScore": number,
  "auditAnalysis": "string (Ton analyse courte)",
  "hookMessage": "string (Le DM prêt à envoyer)"
}
`;

    try {
      console.log(`🧠 Audit du profil sur ${network} via Gemini 1.5 Pro...`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, "").replace(/```/g, "");
      return JSON.parse(text);
    } catch (error) {
      console.error("❌ Erreur lors de l'audit Gemini :", error);
      throw error;
    }
  }
}
