import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function Topbar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
  }, []);

  async function handleLogOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-6 py-3">
      <input
        type="text"
        placeholder="Search markets..."
        className="flex-1 max-w-md rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="ml-auto flex items-center gap-4">
        {/* Real balance comes from the backend once /api/profile exists, placeholder for now */}
        <div className="rounded-lg bg-green-50 px-3 py-1.5 text-sm">
          <span className="font-semibold text-green-700">$10,000.00</span>
          <span className="text-green-600 ml-1">Fake Cash</span>
        </div>

        {email ? (
          <button
            onClick={handleLogOut}
            className="h-9 w-9 rounded-full bg-green-600 text-white text-sm font-medium flex items-center justify-center"
            title={email}
          >
            {email.charAt(0).toUpperCase()}
          </button>
        ) : (
          <a
            href="/login"
            className="text-sm font-medium text-green-700 hover:underline"
          >
            Log in
          </a>
        )}
      </div>
    </header>
  );
}
