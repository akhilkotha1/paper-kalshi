// src/pages/MarketDetailPage.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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

const API_URL = import.meta.env.VITE_API_URL;

export function MarketDetailPage() {
  const { id } = useParams();
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
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
  }, [id]);

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

        {/* Price chart is a later addition — needs historical price data
            we aren't storing yet. Showing current prices plainly for now. */}
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
      </div>

      <div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">Trade</h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="rounded-lg bg-green-50 py-2.5 text-sm font-semibold text-green-700">
              Buy Yes {market.yesBidCents ?? "—"}¢
            </button>
            <button className="rounded-lg bg-red-50 py-2.5 text-sm font-semibold text-red-700">
              Buy No {market.noBidCents ?? "—"}¢
            </button>
          </div>

          {/* Trading isn't wired up yet — this needs a POST /api/trades
              route on the backend, calling the execute_trade function.
              That's next. Buttons are visible but non-functional for now. */}
          <p className="mt-4 text-xs text-gray-400">
            Trading isn't connected yet — coming in the next step.
          </p>
        </div>
      </div>
    </div>
  );
}
