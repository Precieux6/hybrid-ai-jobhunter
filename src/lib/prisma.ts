import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let rawUrl = (process.env.DATABASE_URL || "").trim();

// Débarrasser les guillemets ou quotes éventuelles
if ((rawUrl.startsWith('"') && rawUrl.endsWith('"')) || (rawUrl.startsWith("'") && rawUrl.endsWith("'"))) {
  rawUrl = rawUrl.slice(1, -1).trim();
}

// Extraction robuste de l'URL Postgres si du texte a été collé avec
const match = rawUrl.match(/postgres(?:ql)?:\/\/[^\s"']+/);
const connectionString = match ? match[0] : rawUrl;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
