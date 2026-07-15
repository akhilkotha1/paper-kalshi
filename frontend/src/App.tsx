import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import { Auth } from "./components/Auth";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On first load, check if there's already a logged-in session
    // stored in the browser 
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Subscribe to auth changes, this fires automatically whenever
    // someone logs in, logs out, or their session refreshes. This is
    // what makes the UI update the instant Auth.tsx's handleLogIn
    // succeeds, with no manual wiring between the two components
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // Cleanup: stop listening when this component unmounts, to avoid
    // a memory leak / duplicate listeners if App ever re-renders.
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>Paper Kalshi</h1>

      {session ? (
        <div>
          <p>Logged in as {session.user.email}</p>
          <button onClick={handleLogOut}>Log Out</button>
        </div>
      ) : (
        <Auth />
      )}
    </div>
  );
}

export default App;
