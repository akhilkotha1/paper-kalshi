// src/pages/MarketsPage.tsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type Market = {
  id: string;
  title: string;
  category: string | null;
  status: string;
  eventTicker: string;
  eventTitle: string | null;
  yesBidCents: number | null;
  noBidCents: number | null;
  volume: string;
  closeTime: string | null;
};

const API_URL = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 25;
const POLL_INTERVAL_MS = 15_000; // refresh prices every 15s while this page is open

export function MarketsPage() {
  // useSearchParams keeps search/category/page in the URL itself
  // (e.g. /markets?q=fed&category=Politics) — so results are
  // shareable/bookmarkable, and the Topbar search can link straight
  // here with a query already applied.
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const page = Number(searchParams.get("page") ?? "0");

  const [markets, setMarkets] = useState<Market[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function loadMarkets() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));

    fetch(`${API_URL}/api/markets?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setMarkets(data.markets);
        setTotal(data.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch markets:", err);
        setErrorMessage("Could not load markets. Is the backend running?");
        setLoading(false);
      });
  }

  useEffect(() => {
    setLoading(true);
    loadMarkets();

    // Live-updating prices: quietly re-fetch on an interval. Doesn't
    // reset `loading` on subsequent polls, so the page doesn't flash
    // a loading state every 15 seconds — just the numbers update.
    const interval = setInterval(loadMarkets, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, page]);

  useEffect(() => {
    fetch(`${API_URL}/api/market-categories`)
      .then((res) => res.json())
      .then(setCategories)
      .catch((err) => console.error("Failed to fetch categories:", err));
  }, []);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // any filter change resets to page 0
    setSearchParams(next);
  }

  function goToPage(newPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Group the current page of results by event, so multi-outcome
  // events (e.g. "Medic vs Rodriguez" with two candidate markets)
  // render as one card with each market listed inside — instead of
  // scattered flat rows. NOTE: grouping only happens within the
  // current page's 25 results; an event whose markets straddle two
  // pages will appear split. A fuller fix would group server-side.
  const groups = new Map<string, { eventTitle: string; markets: Market[] }>();
  for (const m of markets) {
    const key = m.eventTicker;
    if (!groups.has(key)) {
      groups.set(key, { eventTitle: m.eventTitle || m.title, markets: [] });
    }
    groups.get(key)!.markets.push(m);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Markets</h1>
      <p className="mt-1 text-gray-600">
        Browse and trade on real-world events with fake money.
      </p>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          placeholder="Search markets..."
          value={q}
          onChange={(e) => updateParam("q", e.target.value)}
          className="flex-1 max-w-sm rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={category}
          onChange={(e) => updateParam("category", e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 space-y-4">
        {loading && (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
            Loading markets...
          </p>
        )}
        {errorMessage && (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-red-600">
            {errorMessage}
          </p>
        )}
        {!loading && !errorMessage && markets.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
            No markets match your filters.
          </p>
        )}

        {Array.from(groups.entries()).map(([eventTicker, group]) => (
          <div
            key={eventTicker}
            className="rounded-xl border border-gray-200 bg-white overflow-hidden"
          >
            {/* Only show an event header when there's more than one
                market under it — a single-market event doesn't need
                a redundant wrapper title above its own name. */}
            {group.markets.length > 1 && (
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="font-semibold text-gray-900">{group.eventTitle}</p>
              </div>
            )}
            <div className="divide-y divide-gray-100">
              {group.markets.map((market) => (
                <Link
                  key={market.id}
                  to={`/markets/${market.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-green-50 flex items-center justify-center text-green-700 font-semibold text-sm">
                    {market.title.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {market.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {market.category && `${market.category} · `}
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
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page + 1} of {totalPages} ({total} markets)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
