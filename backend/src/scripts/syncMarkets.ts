// src/scripts/syncMarkets.ts
//
// Fetches real markets from Kalshi's public API and saves them into
// your `markets` table via Prisma. Run manually for now:
//
//   npx tsx src/scripts/syncMarkets.ts
//
// IMPORTANT: we hit the /events endpoint, not /markets directly.
// Kalshi's docs confirm GET /events excludes multivariate (MVE)
// combo markets automatically — that's what was flooding our
// earlier attempts with garbled, zero-price junk. /events also
// carries `category`, which turns out to live at the event level,
// not on individual markets (why category kept coming back empty).
// with_nested_markets=true bundles each event's real markets into
// the same response, so we don't need a second call per event.

import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const KALSHI_API_BASE = "https://external-api.kalshi.com/trade-api/v2";

// Shape of one market, as nested inside an event's `markets` array.
type KalshiMarket = {
  ticker: string;
  event_ticker: string;
  title: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  no_bid_dollars?: string;
  no_ask_dollars?: string;
  last_price_dollars?: string;
  volume_fp?: string;
  open_interest_fp?: string;
  open_time?: string;
  close_time?: string;
  expiration_time?: string;
  status: string;
};

// Shape of one event, which is what we're actually paginating over.
type KalshiEvent = {
  event_ticker: string;
  series_ticker?: string;
  title: string;
  category?: string;
  markets?: KalshiMarket[];
};

function mapStatus(kalshiStatus: string): "open" | "closed" | "settled" {
  if (kalshiStatus === "settled" || kalshiStatus === "finalized") return "settled";
  if (kalshiStatus === "closed") return "closed";
  return "open";
}

function dollarsToCents(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

function toInt(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : Math.round(parsed);
}

// Fetches events (with nested markets) until we've collected enough
// real markets, or run out of pages.
async function fetchEventsWithMarkets(): Promise<
  { market: KalshiMarket; event: KalshiEvent }[]
> {
  const collected: { market: KalshiMarket; event: KalshiEvent }[] = [];
  let cursor: string | undefined;
  let pagesChecked = 0;
  const MAX_PAGES = 10;
  const TARGET_COUNT = 100;

  while (pagesChecked < MAX_PAGES && collected.length < TARGET_COUNT) {
    const url = new URL(`${KALSHI_API_BASE}/events`);
    url.searchParams.set("status", "open");
    url.searchParams.set("with_nested_markets", "true");
    url.searchParams.set("limit", "200");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Kalshi API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const events: KalshiEvent[] = data.events ?? [];

    let pageMarketCount = 0;
    for (const event of events) {
      for (const market of event.markets ?? []) {
        collected.push({ market, event });
        pageMarketCount++;
      }
    }

    console.log(
      `Page ${pagesChecked + 1}: got ${events.length} events, ${pageMarketCount} markets.`
    );

    pagesChecked++;
    cursor = data.cursor || undefined;
    if (!cursor) break;
  }

  return collected;
}

export async function runSync() {
  console.log("Fetching open events (with nested markets) from Kalshi...");
  const items = await fetchEventsWithMarkets();
  console.log(`\nCollected ${items.length} real markets total.\n`);

  let savedCount = 0;

  for (const { market: m, event } of items) {
    const market = await prisma.market.upsert({
      where: { kalshiTicker: m.ticker },
      create: {
        kalshiTicker: m.ticker,
        eventTicker: m.event_ticker,
        eventTitle: event.title,
        seriesTicker: event.series_ticker ?? null,
        title: m.yes_sub_title || m.title,
        subtitle: m.yes_sub_title ?? null,
        category: event.category ?? null,
        yesBidCents: dollarsToCents(m.yes_bid_dollars),
        yesAskCents: dollarsToCents(m.yes_ask_dollars),
        noBidCents: dollarsToCents(m.no_bid_dollars),
        noAskCents: dollarsToCents(m.no_ask_dollars),
        lastPriceCents: dollarsToCents(m.last_price_dollars),
        volume: toInt(m.volume_fp),
        openInterest: toInt(m.open_interest_fp),
        openTime: m.open_time ? new Date(m.open_time) : null,
        closeTime: m.close_time ? new Date(m.close_time) : null,
        expirationTime: m.expiration_time ? new Date(m.expiration_time) : null,
        status: mapStatus(m.status),
        rawData: m,
      },
      update: {
        eventTitle: event.title,
        category: event.category ?? null,
        yesBidCents: dollarsToCents(m.yes_bid_dollars),
        yesAskCents: dollarsToCents(m.yes_ask_dollars),
        noBidCents: dollarsToCents(m.no_bid_dollars),
        noAskCents: dollarsToCents(m.no_ask_dollars),
        lastPriceCents: dollarsToCents(m.last_price_dollars),
        volume: toInt(m.volume_fp),
        openInterest: toInt(m.open_interest_fp),
        status: mapStatus(m.status),
        rawData: m,
        lastSyncedAt: new Date(),
      },
    });

    // Record a price snapshot every cycle — this is what a chart
    // reads from. Deliberately a separate insert (never an update)
    // since each row is meant to be a permanent point in time.
    await prisma.priceHistory.create({
      data: {
        marketId: market.id,
        yesPriceCents: dollarsToCents(m.yes_bid_dollars),
        noPriceCents: dollarsToCents(m.no_bid_dollars),
      },
    });

    savedCount++;
  }

  console.log(`Saved/updated ${savedCount} markets in the database.`);
}

// Only run immediately if this file is executed directly
// (npx tsx src/scripts/syncMarkets.ts) — NOT when imported by
// syncLoop.ts, which calls runSync() itself on a timer instead.
if (process.argv[1]?.endsWith("syncMarkets.ts")) {
  runSync()
    .catch((err) => {
      console.error("Sync failed:", err);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
