// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MarketsPage } from "./pages/MarketsPage";
import { MarketDetailPage } from "./pages/MarketDetailPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";

function App() {
  return (
    <Routes>
      {/* Public pages — no sidebar/topbar shell */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Logged-in app pages — all share the Sidebar + Topbar shell */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<ComingSoonPage title="Dashboard" />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/markets/:id" element={<MarketDetailPage />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
        <Route path="/leaderboard" element={<ComingSoonPage title="Leaderboard" />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/profile" element={<ComingSoonPage title="Profile & Settings" />} />
      </Route>
    </Routes>
  );
}

export default App;
