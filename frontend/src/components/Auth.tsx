// src/components/Auth.tsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setInfoMessage("Account created. Check your email to confirm, then log in.");
  }

  async function handleLogIn() {
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErrorMessage(error.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <button
        onClick={handleLogIn}
        disabled={loading}
        className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        Log In
      </button>
      <button
        onClick={handleSignUp}
        disabled={loading}
        className="w-full rounded-lg border border-green-600 py-2.5 text-sm font-semibold text-green-700 disabled:opacity-50"
      >
        Sign Up
      </button>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      {infoMessage && <p className="text-sm text-green-700">{infoMessage}</p>}
    </div>
  );
}
