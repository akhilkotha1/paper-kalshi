// src/scripts/inspectMarket.ts
//
// One-off debugging script — finds a market with a suspicious
// (comma-heavy) title and prints its full raw Kalshi payload, so we
// can see every field Kalshi actually sent, not just the ones our
// sync script chose to map.
//
// Run with: npx tsx src/scripts/inspectMarket.ts

import "dotenv/config";
import { prisma } from "../lib/prisma.js";

async function main() {
  const arg = process.argv[2]; // whatever you type after the script name

  // Usage:
  //   npx tsx src/scripts/inspectMarket.ts
  //     -> prints 3 different garbled-title markets
  //   npx tsx src/scripts/inspectMarket.ts clean
  //     -> prints 3 markets WITHOUT commas in the title, for comparison
  //   npx tsx src/scripts/inspectMarket.ts KXSOMETICKER-123
  //     -> prints that exact market by ticker

  let markets;

  if (arg === "clean") {
    markets = await prisma.market.findMany({
      where: { NOT: { title: { contains: "," } } },
      take: 3,
    });
  } else if (arg) {
    markets = await prisma.market.findMany({
      where: { kalshiTicker: arg },
    });
  } else {
    markets = await prisma.market.findMany({
      where: { title: { contains: "," } },
      take: 3,
    });
  }

  if (markets.length === 0) {
    console.log("No matching markets found.");
    return;
  }

  for (const market of markets) {
    console.log("\n=======================================");
    console.log("kalshiTicker:", market.kalshiTicker);
    console.log("Our stored title:", market.title);
    console.log("\nFull raw Kalshi data:\n");
    console.log(JSON.stringify(market.rawData, null, 2));
  }
}

main()
  .catch((err) => {
    console.error("Inspection failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });