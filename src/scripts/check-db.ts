import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const count = await prisma.targets.count();
  const latest = await prisma.targets.findMany({
    take: 5,
    orderBy: { created_at: "desc" },
    select: { title: true, source: true, ai_match_score: true }
  });
  console.log(`TOTAL OFFRES EN DB : ${count}`);
  console.log("Dernières offres :", latest);
  process.exit(0);
}

main();
