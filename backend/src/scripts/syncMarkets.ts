// Fetches real markets from Kalshi's public API and saves them into
// markets table via Prisma

// Later this becomes something that will run on a repeating timer, but
// for now we're just proving the whole chain works: Kalshi -> 
// database ->  API ->  frontend

import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const KALSHI_API_BASE = "https://external-api.kalshi.com/trade-api/v2";

// The shape of one market object as Kalshi's API returns it
// Not exhaustive, just the fields we actually use
type KalshiMarket = {
  ticker: string;
  event_ticker: string;
  series_ticker?: string;
  title: string;
  subtitle?: string;
  category?: string;
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  last_price?: number;
  volume?: number;
  open_interest?: number;
  open_time?: string;
  close_time?: string;
  expiration_time?: string;
  status: string;
};

function mapStatus(kalshiStatus: string): "open" | "closed" | "settled" {
  if (kalshiStatus === "settled" || kalshiStatus === "finalized") return "settled";
  if (kalshiStatus === "closed") return "closed";
  return "open";
}

async function fetchOpenMarkets(): Promise<KalshiMarket[]> {
  const url = new URL(`${KALSHI_API_BASE}/markets`);
  url.searchParams.set("status", "open");
  url.searchParams.set("limit", "100"); // small batch for a first test run

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`Kalshi API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.markets ?? [];
}

async function main() {
  console.log("Fetching open markets from Kalshi...");
  const kalshiMarkets = await fetchOpenMarkets();
  console.log(`Got ${kalshiMarkets.length} markets from Kalshi.`);

  let savedCount = 0;

  for (const m of kalshiMarkets) {
    await prisma.market.upsert({
      where: { kalshiTicker: m.ticker },
      create: {
        kalshiTicker: m.ticker,
        eventTicker: m.event_ticker,
        seriesTicker: m.series_ticker ?? null,
        title: m.title,
        subtitle: m.subtitle ?? null,
        category: m.category ?? null,
        yesBidCents: m.yes_bid ?? null,
        yesAskCents: m.yes_ask ?? null,
        noBidCents: m.no_bid ?? null,
        noAskCents: m.no_ask ?? null,
        lastPriceCents: m.last_price ?? null,
        volume: m.volume ?? 0,
        openInterest: m.open_interest ?? 0,
        openTime: m.open_time ? new Date(m.open_time) : null,
        closeTime: m.close_time ? new Date(m.close_time) : null,
        expirationTime: m.expiration_time ? new Date(m.expiration_time) : null,
        status: mapStatus(m.status),
        rawData: m,
      },
      update: {
        yesBidCents: m.yes_bid ?? null,
        yesAskCents: m.yes_ask ?? null,
        noBidCents: m.no_bid ?? null,
        noAskCents: m.no_ask ?? null,
        lastPriceCents: m.last_price ?? null,
        volume: m.volume ?? 0,
        openInterest: m.open_interest ?? 0,
        status: mapStatus(m.status),
        rawData: m,
        lastSyncedAt: new Date(),
      },
    });
    savedCount++;
  }

  console.log(`Saved/updated ${savedCount} markets in the database.`);
}

main()
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
