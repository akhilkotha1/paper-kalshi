// src/pages/TransactionsPage.tsx
import { useEffect, useState } from "react";
import { authFetch } from "../lib/authFetch";

type Transaction = {
  id: string;
  type: string;
  amountCents: string; // BigInt serializes as a string
  createdAt: string;
  market: { title: string } | null;
};

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    authFetch("/api/transactions")
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch transactions:", err);
        setErrorMessage("Could not load your transaction history.");
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
      <p className="mt-1 text-gray-600">Your cash activity.</p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {loading && <p className="p-6 text-gray-500">Loading...</p>}
        {errorMessage && <p className="p-6 text-red-600">{errorMessage}</p>}
        {!loading && !errorMessage && transactions.length === 0 && (
          <p className="p-6 text-gray-500">No transactions yet.</p>
        )}

        {transactions.map((t) => {
          const amount = Number(t.amountCents) / 100;
          return (
            <div key={t.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 capitalize">
                  {t.type}
                  {t.market ? ` — ${t.market.title}` : ""}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(t.createdAt).toLocaleString()}
                </p>
              </div>
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
  );
}
