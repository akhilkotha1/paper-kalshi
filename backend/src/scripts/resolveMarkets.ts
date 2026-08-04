// src/scripts/resolveMarkets.ts
//
// Checks Kalshi for markets that have settled (resolved to yes/no)
// among the ones you've already synced, records the outcome, and
// pays out everyone holding a position in that market.
//
// Run manually for now:
//   npx tsx src/scripts/resolveMarkets.ts
//
// Later this can run on the same schedule as syncMarkets.ts.

import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const KALSHI_API_BASE = "https://external-api.kalshi.com/trade-api/v2";

async function main() {
  // Only check markets we think are still open — no point re-checking
  // ones we've already resolved.
  const openMarkets = await prisma.market.findMany({
    where: { status: "open" },
    select: { id: true, kalshiTicker: true, title: true },
  });

  console.log(`Checking ${openMarkets.length} open markets for settlement...`);

  let resolvedCount = 0;

  for (const market of openMarkets) {
    const res = await fetch(`${KALSHI_API_BASE}/markets/${market.kalshiTicker}`);
    if (!res.ok) {
      console.warn(`Could not fetch ${market.kalshiTicker}, skipping.`);
      continue;
    }

    const data = await res.json();
    const kalshiMarket = data.market;

    if (kalshiMarket.status !== "settled" && kalshiMarket.status !== "finalized") {
      continue; // still open, nothing to do
    }

    const result =
      kalshiMarket.result === "yes"
        ? "yes"
        : kalshiMarket.result === "no"
        ? "no"
        : "void";

    console.log(`Resolving "${market.title}" -> ${result}`);

    // Mark the market itself as settled
    await prisma.market.update({
      where: { id: market.id },
      data: { status: "settled" },
    });

    // Record the resolution (skip if somehow already recorded)
    const existing = await prisma.marketResolution.findUnique({
      where: { marketId: market.id },
    });

    if (!existing) {
      await prisma.marketResolution.create({
        data: {
          marketId: market.id,
          result,
          payoutPerContractCents: result === "void" ? 0 : 100,
          rawData: kalshiMarket,
        },
      });
    }

    // Pay out everyone holding a position — this calls the SQL
    // function from settle_market_positions.sql via a raw query.
    await prisma.$queryRaw`SELECT settle_market_positions(${market.id}::uuid)`;

    resolvedCount++;
  }

  console.log(`Resolved and paid out ${resolvedCount} markets.`);
}

main()
  .catch((err) => {
    console.error("Resolve failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
