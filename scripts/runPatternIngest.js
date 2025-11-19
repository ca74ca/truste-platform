#!/usr/bin/env node

// scripts/runPatternIngest.js
// Standalone entry point for Render Cron Job

import { ingestPatternsNightly } from "../backend/patternIngestor.js";

console.log("===========================================");
console.log("TRUSTE Pattern Ingestion - Cron Job Started");
console.log("Time:", new Date().toISOString());
console.log("===========================================");

async function run() {
  try {
    await ingestPatternsNightly();
    console.log("✅ Pattern ingestion completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Pattern ingestion failed:", error);
    process.exit(1);
  }
}

run();
