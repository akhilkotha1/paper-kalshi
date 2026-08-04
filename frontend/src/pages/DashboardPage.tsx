// src/pages/DashboardPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../lib/authFetch";

const API_URL = import.meta.env.VITE_API_URL;

type Profile = { username: string; balanceCents: string; realizedPnlCents: string };
type Position = {
  quantity: number;
  side: "yes" | "no";
  avgCostCents: string;
  market: { yesBidCents: number | null; noBidCents: number | null };
};
type Transaction = {
  id: string;
  type: string;
  amountCents: string;
  createdAt: string;
  market: { title: string } | null;
};
type Market = {
  id: string;
  title: string;
  yesBidCents: number | null;
  noBidCents: number | null;
  volume: string;
};

export function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [trending, setTrending] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch("/api/profile").then((r) => r.json()),
      authFetch("/api/portfolio").then((r) => r.json()),
      authFetch("/api/transactions").then((r) => r.json()),
      fetch(`${API_URL}/api/markets?limit=5`).then((r) => r.json()),
    ])
      .then(([profileData, portfolioData, txData, marketsData]) => {
        setProfile(profileData);
        setPositions(portfolioData);
        setTransactions(txData.slice(0, 5));
        setTrending(marketsData.markets);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard:", err);
        setLoading(false);
      });
  }, []);

  if (loading || !profile) return <p className="text-gray-500">Loading...</p>;

  const balance = Number(profile.balanceCents) / 100;
  const positionsValue = positions.reduce((sum, p) => {
    const price = p.side === "yes" ? p.market.yesBidCents : p.market.noBidCents;
    return sum + (price ?? 0) * p.quantity;
  }, 0) / 100;
  const portfolioValue = balance + positionsValue;
  const realizedPnl = Number(profile.realizedPnlCents) / 100;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">
        Welcome back, {profile.username}! 👋
      </h1>
      <p className="mt-1 text-gray-600">
        Track markets, manage your portfolio, and make predictions.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Fake Cash Balance</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${balance.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Portfolio Value</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${portfolioValue.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">All-Time Realized P&L</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              realizedPnl >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">🔥 Trending Markets</h2>
            <Link to="/markets" className="text-sm text-green-700">
              View all markets
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {trending.map((m) => (
              <Link
                key={m.id}
                to={`/markets/${m.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-900 truncate pr-4">
                  {m.title}
                </span>
                <div className="flex gap-2 shrink-0 text-sm">
                  <span className="text-green-700">Yes {m.yesBidCents ?? "—"}¢</span>
                  <span className="text-red-700">No {m.noBidCents ?? "—"}¢</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {transactions.length === 0 && (
              <p className="p-4 text-sm text-gray-500">No activity yet.</p>
            )}
            {transactions.map((t) => {
              const amount = Number(t.amountCents) / 100;
              return (
                <div key={t.id} className="flex items-center justify-between p-4">
                  <span className="text-sm text-gray-900 capitalize">
                    {t.type}
                    {t.market ? ` — ${t.market.title}` : ""}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      amount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {amount >= 0 ? "+" : ""}
                    {amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
