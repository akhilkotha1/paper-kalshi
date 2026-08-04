// src/pages/PortfolioPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../lib/authFetch";

type Position = {
  id: string;
  side: "yes" | "no";
  quantity: number;
  avgCostCents: string; // Prisma Decimal serializes as a string
  market: {
    id: string;
    title: string;
    yesBidCents: number | null;
    noBidCents: number | null;
  };
};

export function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [sellError, setSellError] = useState<string | null>(null);

  function loadPortfolio() {
    authFetch("/api/portfolio")
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPositions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch portfolio:", err);
        setErrorMessage("Could not load your portfolio.");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function handleSell(p: Position) {
    const priceCents = p.side === "yes" ? p.market.yesBidCents : p.market.noBidCents;
    if (priceCents === null) {
      setSellError("This market has no active price to sell at right now.");
      return;
    }

    setSellError(null);
    setSellingId(p.id);

    try {
      const res = await authFetch("/api/trades", {
        method: "POST",
        body: JSON.stringify({
          marketId: p.market.id,
          side: p.side,
          action: "sell",
          quantity: p.quantity, // sell the full position for now
          priceCents,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sell failed");

      loadPortfolio(); // refresh — this position should now be gone or reduced
    } catch (err) {
      console.error("Sell failed:", err);
      setSellError(err instanceof Error ? err.message : "Sell failed");
    } finally {
      setSellingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
      <p className="mt-1 text-gray-600">Your current positions.</p>

      {sellError && (
        <p className="mt-4 text-sm text-red-600">{sellError}</p>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {loading && <p className="p-6 text-gray-500">Loading...</p>}
        {errorMessage && <p className="p-6 text-red-600">{errorMessage}</p>}
        {!loading && !errorMessage && positions.length === 0 && (
          <p className="p-6 text-gray-500">
            No open positions yet — head to Markets to place your first trade.
          </p>
        )}

        {positions.map((p) => {
          const currentPrice =
            p.side === "yes" ? p.market.yesBidCents : p.market.noBidCents;
          const avgCost = Number(p.avgCostCents);
          const unrealizedPnl =
            currentPrice !== null ? (currentPrice - avgCost) * p.quantity : null;

          return (
            <div key={p.id} className="flex items-center gap-4 p-4">
              <Link to={`/markets/${p.market.id}`} className="flex-1 min-w-0 hover:underline">
                <p className="font-medium text-gray-900 truncate">
                  {p.market.title}
                </p>
                <p className="text-sm text-gray-500">
                  {p.side.toUpperCase()} · {p.quantity} shares · avg{" "}
                  {avgCost.toFixed(0)}¢
                  {currentPrice !== null && ` · now ${currentPrice}¢`}
                </p>
              </Link>

              {unrealizedPnl !== null && (
                <span
                  className={`text-sm font-semibold ${
                    unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {unrealizedPnl >= 0 ? "+" : ""}
                  {(unrealizedPnl / 100).toFixed(2)}
                </span>
              )}

              <button
                onClick={() => handleSell(p)}
                disabled={sellingId === p.id}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-50"
              >
                {sellingId === p.id ? "Selling..." : "Sell"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
