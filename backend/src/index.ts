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

// First real route: list markets from the database
app.get("/api/markets", async (_req, res) => {
  try {
    const markets = await prisma.market.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(markets);
  } catch (err) {
    console.error("Failed to fetch markets:", err);
    res.status(500).json({ error: "Failed to fetch markets" });
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

// Protected test route — requires a valid Supabase login token.
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
