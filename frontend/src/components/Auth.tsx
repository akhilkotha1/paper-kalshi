// A simple email/password login + signup form. Calls Supabase Auth
// directly from the browser using the publishable-key client

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
      return;
    }

    // No need to manually update UI here, App.tsx listens for auth
    // state changes and will react automatically once login succeeds
  }

  return (
    <div>
      <h2>Log in or sign up</h2>

      <div>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      </div>

      <div>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      </div>

      <button onClick={handleLogIn} disabled={loading}>
        Log In
      </button>
      <button onClick={handleSignUp} disabled={loading}>
        Sign Up
      </button>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {infoMessage && <p style={{ color: "green" }}>{infoMessage}</p>}
    </div>
  );
}
