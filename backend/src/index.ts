// Entry point for the backend API server. Right now this has:
//   - a health check route, just to confirm the server is alive
//   - one real route (GET /api/markets) that queries database
//     via Prisma and returns it as JSON
//
// Run with npx tsx watch src/index.ts

import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js"; // note the .js extension — required under ESM + nodenext, even though the source file is .ts
import { requireAuth } from "./middleware/requireAuth.js";

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

// Protected test route that requires a valid Supabase login token.
// Try hitting this without a token first (expect 401), then with
// one (expect user id + email back).
app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});