// src/pages/LeaderboardPage.tsx
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

type LeaderboardEntry = {
  id: string;
  username: string;
  realizedPnlCents: string;
  totalTrades: number;
  wins: number;
  losses: number;
};

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/leaderboard`)
      .then((res) => res.json())
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load leaderboard:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
      <p className="mt-1 text-gray-600">Top traders by realized profit.</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {loading && <p className="p-6 text-gray-500">Loading...</p>}
        {!loading && entries.length === 0 && (
          <p className="p-6 text-gray-500">No traders yet.</p>
        )}

        {entries.map((entry, i) => {
          const pnl = Number(entry.realizedPnlCents) / 100;
          const winRate =
            entry.totalTrades > 0
              ? Math.round((entry.wins / entry.totalTrades) * 100)
              : 0;

          return (
            <div key={entry.id} className="flex items-center gap-4 p-4">
              <span className="w-8 text-center font-semibold text-gray-400">
                #{i + 1}
              </span>
              <div className="h-9 w-9 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-medium">
                {entry.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{entry.username}</p>
                <p className="text-sm text-gray-500">
                  {entry.totalTrades} trades · {winRate}% win rate
                </p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  pnl >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
