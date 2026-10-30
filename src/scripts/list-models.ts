import "dotenv/config";

async function main() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("=== Modèles disponibles pour votre clé API ===");
    if (data.models) {
      data.models.forEach((m: any) => console.log(m.name));
    } else {
      console.log(data);
    }
  } catch (e) {
    console.error(e);
  }
}
main();
