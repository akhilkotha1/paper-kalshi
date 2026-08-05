// src/index.ts
//
// Entry point for the backend API server. Right now this has:
//   - a health check route, just to confirm the server is alive
//   - one real route (GET /api/markets) that queries your database
//     via Prisma and returns it as JSON
//
// Run with:  npx tsx watch src/index.ts

import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js"; // note the .js extension — required under ESM + nodenext, even though the source file is .ts
import { requireAuth } from "./middleware/requireAuth.js";

// Postgres `bigint` columns come back from Prisma as JavaScript's
// BigInt type. JSON.stringify doesn't know how to serialize BigInt
// by default and throws — this teaches it to convert BigInts to
// plain strings whenever any route sends JSON. Without this, any
// route touching a bigint column (volume, balance_cents, etc.)
// crashes the moment it has real data to return.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check — hit this in a browser to confirm the server is running at all
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "paper-kalshi backend is running" });
});

// List markets — supports search, category filter, and pagination.
//   ?q=fed              search title (case-insensitive)
//   ?category=Politics  filter by category
//   ?limit=50&offset=0  pagination (limit capped at 200)
app.get("/api/markets", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const category =
      typeof req.query.category === "string" ? req.query.category : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const where = {
      ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
      ...(category ? { category } : {}),
    };

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy: { volume: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.market.count({ where }),
    ]);

    res.json({ markets, total, limit, offset });
  } catch (err) {
    console.error("Failed to fetch markets:", err);
    res.status(500).json({ error: "Failed to fetch markets" });
  }
});

// Distinct category list, for populating a filter dropdown on the frontend.
app.get("/api/market-categories", async (_req, res) => {
  try {
    const rows = await prisma.market.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    res.json(rows.map((r) => r.category));
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Fetch a single market by its internal id
app.get("/api/markets/:id", async (req, res) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id },
    });

    if (!market) {
      res.status(404).json({ error: "Market not found" });
      return;
    }

    res.json(market);
  } catch (err) {
    console.error("Failed to fetch market:", err);
    res.status(500).json({ error: "Failed to fetch market" });
  }
});

// Price history for one market, oldest to newest — powers the chart.
// Only has data from whenever syncLoop.ts started running with the
// price-snapshot feature; there's nothing before that.
app.get("/api/markets/:id/price-history", async (req, res) => {
  try {
    const history = await prisma.priceHistory.findMany({
      where: { marketId: req.params.id },
      orderBy: { recordedAt: "asc" },
      take: 500,
    });
    res.json(history);
  } catch (err) {
    console.error("Failed to fetch price history:", err);
    res.status(500).json({ error: "Failed to fetch price history" });
  }
});
// Try hitting this WITHOUT a token first (expect 401), then WITH
// one (expect your user id + email back).
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Execute a trade (buy or sell). Requires login. Calls the
// execute_trade Postgres function via a raw SQL query — Prisma
// doesn't know about custom database functions the way it knows
// about your tables, so $queryRaw is how we reach it. The template
// syntax (${...}) is Prisma's safe way of inserting values into raw
// SQL — it parameterizes them properly instead of just concatenating
// strings, which avoids SQL injection.
app.post("/api/trades", requireAuth, async (req, res) => {
  const { marketId, side, action, quantity, priceCents } = req.body;

  if (!marketId || !side || !action || !quantity || !priceCents) {
    res.status(400).json({
      error: "Missing required fields: marketId, side, action, quantity, priceCents",
    });
    return;
  }

  try {
    const result = await prisma.$queryRaw<{ execute_trade: string }[]>`
      SELECT execute_trade(
        ${req.user!.id}::uuid,
        ${marketId}::uuid,
        ${side}::contract_side,
        ${action}::trade_action,
        ${quantity}::integer,
        ${priceCents}::smallint
      ) as execute_trade
    `;

    res.json({ tradeId: result[0].execute_trade });
  } catch (err) {
    console.error("Trade failed:", err);
    // Postgres RAISE EXCEPTION messages (like "insufficient balance")
    // land in err.message — surfacing that directly gives the
    // frontend a real, useful error instead of a generic one.
    const message = err instanceof Error ? err.message : "Trade failed";
    res.status(400).json({ error: message });
  }
});

// Current user's profile (balance, stats) — powers the real balance
// shown in the frontend's top bar.
app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user!.id },
    });

    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(profile);
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Current user's open positions, with the related market's info
// included — so the frontend doesn't need a second request per row.
app.get("/api/portfolio", requireAuth, async (req, res) => {
  try {
    const positions = await prisma.position.findMany({
      where: { userId: req.user!.id, quantity: { gt: 0 } },
      include: { market: true },
      orderBy: { updatedAt: "desc" },
    });

    res.json(positions);
  } catch (err) {
    console.error("Failed to fetch portfolio:", err);
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

// Current user's full cash transaction history.
app.get("/api/transactions", requireAuth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user!.id },
      include: { market: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(transactions);
  } catch (err) {
    console.error("Failed to fetch transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Update the current user's profile (currently just username).
app.patch("/api/profile", requireAuth, async (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== "string" || username.trim().length === 0) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  try {
    const updated = await prisma.profile.update({
      where: { id: req.user!.id },
      data: { username: username.trim() },
    });
    res.json(updated);
  } catch (err) {
    console.error("Failed to update profile:", err);
    // Prisma throws a known error code (P2002) on unique constraint
    // violations — username is unique, so a duplicate name lands here.
    res.status(400).json({ error: "That username may already be taken." });
  }
});

// Reset the current user's fake balance back to the starting amount.
// Does NOT touch existing positions/trades — just the cash balance,
// matching the "This action cannot be undone" framing in the mockup.
app.post("/api/profile/reset", requireAuth, async (req, res) => {
  try {
    const updated = await prisma.profile.update({
      where: { id: req.user!.id },
      data: { balanceCents: 1_000_000 },
    });
    res.json(updated);
  } catch (err) {
    console.error("Failed to reset balance:", err);
    res.status(500).json({ error: "Failed to reset balance" });
  }
});

// Public leaderboard — top users by realized profit/loss.
app.get("/api/leaderboard", async (_req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { realizedPnlCents: "desc" },
      take: 50,
      select: {
        id: true,
        username: true,
        realizedPnlCents: true,
        totalTrades: true,
        wins: true,
        losses: true,
      },
    });
    res.json(profiles);
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
