// Fetches markets from the Express backend (not from Supabase
// directly) and displays them

import { useEffect, useState } from "react";

type Market = {
  id: string;
  title: string;
  status: string;
  yesBidCents: number | null;
  yesAskCents: number | null;
};

const API_URL = import.meta.env.VITE_API_URL;

export function MarketsList() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/markets`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
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

  if (loading) {
    return <p>Loading markets...</p>;
  }

  if (errorMessage) {
    return <p style={{ color: "red" }}>{errorMessage}</p>;
  }

  if (markets.length === 0) {
    return <p>No markets yet — the sync job hasn't populated any data.</p>;
  }

  return (
    <ul>
      {markets.map((market) => (
        <li key={market.id}>
          {market.title} — YES {market.yesBidCents}¢ / NO{" "}
          {market.yesAskCents}¢
        </li>
      ))}
    </ul>
  );
}
