// src/pages/MarketsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Market = {
  id: string;
  title: string;
  category: string | null;
  status: string;
  yesBidCents: number | null;
  noBidCents: number | null;
  volume: string; // BigInt columns arrive as strings (see backend's toJSON fix)
  closeTime: string | null;
};

const API_URL = import.meta.env.VITE_API_URL;

export function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/markets`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMarkets(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch markets:", err);
        setErrorMessage("Could not load markets. Is the backend running?");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Markets</h1>
      <p className="mt-1 text-gray-600">
        Browse and trade on real-world events with fake money.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {loading && <p className="p-6 text-gray-500">Loading markets...</p>}

        {errorMessage && (
          <p className="p-6 text-red-600">{errorMessage}</p>
        )}

        {!loading && !errorMessage && markets.length === 0 && (
          <p className="p-6 text-gray-500">
            No markets yet — run the sync job to pull in real data.
          </p>
        )}

        {markets.map((market) => (
          <Link
            key={market.id}
            to={`/markets/${market.id}`}
            className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="h-12 w-12 shrink-0 rounded-lg bg-green-50 flex items-center justify-center text-green-700 font-semibold">
              {market.title.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{market.title}</p>
              <p className="text-sm text-gray-500">
                {Number(market.volume).toLocaleString()} vol
                {market.closeTime &&
                  ` · Ends ${new Date(market.closeTime).toLocaleDateString()}`}
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              <span className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-700">
                Yes {market.yesBidCents ?? "—"}¢
              </span>
              <span className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                No {market.noBidCents ?? "—"}¢
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
