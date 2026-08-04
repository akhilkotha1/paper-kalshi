// src/pages/ProfilePage.tsx
import { useEffect, useState } from "react";
import { authFetch } from "../lib/authFetch";

type Profile = {
  username: string;
  balanceCents: string;
  realizedPnlCents: string;
  totalTrades: number;
  wins: number;
  losses: number;
};

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  function loadProfile() {
    authFetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setUsernameInput(data.username);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSaveUsername() {
    setSaveMessage(null);
    setSaveError(null);
    try {
      const res = await authFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ username: usernameInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setProfile(data);
      setSaveMessage("Saved.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleReset() {
    if (!confirm("Reset your fake balance to $10,000? This cannot be undone.")) {
      return;
    }
    setResetting(true);
    try {
      const res = await authFetch("/api/profile/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset");
      setProfile(data);
    } catch (err) {
      console.error("Reset failed:", err);
    } finally {
      setResetting(false);
    }
  }

  if (loading || !profile) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">Profile Information</h2>
        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            onClick={handleSaveUsername}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
        {saveMessage && <p className="mt-2 text-sm text-green-700">{saveMessage}</p>}
        {saveError && <p className="mt-2 text-sm text-red-600">{saveError}</p>}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold text-gray-900">Stats</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Fake Cash Balance</dt>
            <dd className="font-semibold text-gray-900">
              ${(Number(profile.balanceCents) / 100).toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Realized P&L</dt>
            <dd
              className={`font-semibold ${
                Number(profile.realizedPnlCents) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              ${(Number(profile.realizedPnlCents) / 100).toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Trades Placed</dt>
            <dd className="font-semibold text-gray-900">{profile.totalTrades}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Win / Loss</dt>
            <dd className="font-semibold text-gray-900">
              {profile.wins} / {profile.losses}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-xl border border-red-200 bg-white p-6">
        <h2 className="font-semibold text-red-700">Danger Zone</h2>
        <p className="mt-1 text-sm text-gray-600">
          Reset your fake cash balance back to $10,000. Your positions and
          trade history are not affected.
        </p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="mt-3 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
        >
          {resetting ? "Resetting..." : "Reset to $10,000"}
        </button>
      </div>
    </div>
  );
}
