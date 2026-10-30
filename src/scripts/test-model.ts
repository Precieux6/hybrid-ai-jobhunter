import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function testModel(name: string) {
  try {
    const model = genAI.getGenerativeModel({ model: name });
    const res = await model.generateContent("Réponds en un seul mot : 'OK'");
    console.log(`✅ Modèle ${name} fonctionne :`, res.response.text().trim());
    return true;
  } catch (err: any) {
    console.log(`❌ Modèle ${name} échoue :`, err.message);
    return false;
  }
}

async function main() {
  await testModel("gemini-3.8-flash");
  await testModel("gemini-3.1-pro-preview");
}

main();
