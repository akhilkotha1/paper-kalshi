// src/pages/LoginPage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Auth } from "../components/Auth";

export function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/dashboard");
    });

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl bg-white border border-gray-200 p-8 shadow-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="text-green-600 text-xl">📈</span>
          <span className="font-semibold text-lg text-gray-900">Paper Kalshi</span>
        </div>
        <Auth />
      </div>
    </div>
  );
}
