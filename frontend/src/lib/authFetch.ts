// src/lib/authFetch.ts
//
// Like fetch(), but automatically attaches the current user's
// Supabase login token as an Authorization header — every route
// that uses requireAuth on the backend needs this, so rather than
// repeating the token-fetching logic in every component, it lives
// here once.

import { supabase } from "./supabaseClient";

const API_URL = import.meta.env.VITE_API_URL;

export async function authFetch(path: string, options: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
