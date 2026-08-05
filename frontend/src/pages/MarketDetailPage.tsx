// src/pages/MarketDetailPage.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { authFetch } from "../lib/authFetch";
import { PriceChart } from "../components/PriceChart";

type Market = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  yesBidCents: number | null;
  noBidCents: number | null;
  volume: string;
  closeTime: string | null;
};

type PricePoint = {
  recordedAt: string;
  yesPriceCents: number | null;
  noPriceCents: number | null;
};

const API_URL = import.meta.env.VITE_API_URL;

export function MarketDetailPage() {
  const { id } = useParams();
  const [market, setMarket] = useState<Market | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(10);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);
  const [placingTrade, setPlacingTrade] = useState(false);

  function loadMarket() {
    fetch(`${API_URL}/api/markets/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMarket(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch market:", err);
        setErrorMessage("Could not load this market.");
        setLoading(false);
      });
  }

  function loadPriceHistory() {
    fetch(`${API_URL}/api/markets/${id}/price-history`)
      .then((res) => res.json())
      .then(setPriceHistory)
      .catch((err) => console.error("Failed to fetch price history:", err));
  }

  useEffect(() => {
    loadMarket();
    loadPriceHistory();
    const interval = setInterval(() => {
      loadMarket();
      loadPriceHistory();
    }, 15_000); // live-updating price + chart
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleTrade(side: "yes" | "no") {
    if (!market) return;
    const priceCents = side === "yes" ? market.yesBidCents : market.noBidCents;

    if (priceCents === null) {
      setTradeError("This market has no active price right now.");
      return;
    }

    setTradeError(null);
    setTradeSuccess(null);
    setPlacingTrade(true);

    try {
      const res = await authFetch("/api/trades", {
        method: "POST",
        body: JSON.stringify({
          marketId: market.id,
          side,
          action: "buy",
          quantity,
          priceCents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Trade failed");
      }

      setTradeSuccess(
        `Bought ${quantity} ${side.toUpperCase()} @ ${priceCents}¢`
      );
      loadMarket(); // refresh prices/volume after the trade
    } catch (err) {
      console.error("Trade failed:", err);
      setTradeError(err instanceof Error ? err.message : "Trade failed");
    } finally {
      setPlacingTrade(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (errorMessage) return <p className="text-red-600">{errorMessage}</p>;
  if (!market) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Link to="/markets" className="text-sm text-green-700">
          ← Back to Markets
        </Link>

        <div className="mt-4 flex items-center gap-2">
          {market.category && (
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {market.category}
            </span>
          )}
          {market.closeTime && (
            <span className="text-xs text-gray-500">
              Ends {new Date(market.closeTime).toLocaleDateString()}
            </span>
          )}
        </div>

        <h1 className="mt-2 text-2xl font-bold text-gray-900">{market.title}</h1>
        {market.subtitle && (
          <p className="mt-2 text-gray-600">{market.subtitle}</p>
        )}
        <p className="mt-2 text-sm text-gray-500">
          {Number(market.volume).toLocaleString()} vol
        </p>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 flex gap-8">
          <div>
            <p className="text-sm text-gray-500">Yes</p>
            <p className="text-2xl font-bold text-green-600">
              {market.yesBidCents ?? "—"}¢
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">No</p>
            <p className="text-2xl font-bold text-red-600">
              {market.noBidCents ?? "—"}¢
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
          <PriceChart data={priceHistory} />
        </div>
      </div>

      <div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Trade</h2>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleTrade("yes")}
              disabled={placingTrade}
              className="rounded-lg bg-green-50 py-2.5 text-sm font-semibold text-green-700 disabled:opacity-50"
            >
              Buy Yes {market.yesBidCents ?? "—"}¢
            </button>
            <button
              onClick={() => handleTrade("no")}
              disabled={placingTrade}
              className="rounded-lg bg-red-50 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              Buy No {market.noBidCents ?? "—"}¢
            </button>
          </div>

          {tradeError && (
            <p className="mt-3 text-sm text-red-600">{tradeError}</p>
          )}
          {tradeSuccess && (
            <p className="mt-3 text-sm text-green-700">{tradeSuccess}</p>
          )}

          <p className="mt-4 text-xs text-gray-400">
            Not logged in? You'll get an auth error — log in first at /login.
          </p>
        </div>
      </div>
    </div>
  );
}
