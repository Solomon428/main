#!/usr/bin/env node
/**
 * Worker Entry Point for CreditorFlow EMS
 * Run this file to start the background job processor
 *
 * Usage: npx ts-node src/worker.ts
 * Or: node dist/worker.js (after build)
 */

import { getMainWorker } from "@/workflows/main-worker";

console.log("═══════════════════════════════════════════════════");
console.log("  CreditorFlow EMS - Background Worker");
console.log("═══════════════════════════════════════════════════");

async function main() {
  try {
    const worker = getMainWorker();
    await worker.start();

    console.log("");
    console.log("✅ Worker is running and processing jobs...");
    console.log("   Press Ctrl+C to stop gracefully");
    console.log("");
  } catch (error) {
    console.error("❌ Failed to start worker:", error);
    process.exit(1);
  }
}

main();
