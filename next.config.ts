import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "playwright",
    "playwright-extra",
    "puppeteer-extra-plugin-stealth",
    "bullmq",
    "ioredis",
    "pg",
    "@prisma/adapter-pg",
  ],
};

export default nextConfig;
