// src/scripts/syncLoop.ts
//
// Runs the market sync repeatedly, forever, instead of once. This
// is what makes prices "continuously updating" instead of only
// refreshing when you remember to run syncMarkets.ts by hand.
//
// This is meant to run as its OWN long-lived process, in its own
// terminal tab, left running alongside your backend and frontend
// dev servers:
//
//   npx tsx src/scripts/syncLoop.ts
//
// Stop it with Ctrl+C like any other dev process.

import "dotenv/config";
import { runSync } from "./syncMarkets.js";

const INTERVAL_MS = 60_000; // re-sync every 60 seconds

async function loop() {
  console.log(`\n[${new Date().toLocaleTimeString()}] Running sync...`);
  try {
    await runSync();
  } catch (err) {
    // Log and keep going — one failed sync (e.g. a transient Kalshi
    // API error) shouldn't kill the whole long-running process.
    console.error("Sync failed, will retry next interval:", err);
  }
}

console.log(`Starting sync loop — refreshing every ${INTERVAL_MS / 1000}s.`);
loop(); // run once immediately, don't wait for the first interval
setInterval(loop, INTERVAL_MS);
