// scripts/runPatternIngest.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ingestPatternsNightly } from "../backend/patternIngestor.js";

console.log("===========================================");
console.log("TRUSTE Pattern Ingestion - Cron Job Started");
console.log("Time:", new Date().toISOString());
console.log("===========================================");

async function run() {
  try {
    await ingestPatternsNightly();
    console.log("🎉 Nightly ingestion complete!");
  } catch (err) {
    console.error("❌ Pattern ingestion failed:", err);
  }
}

run();
