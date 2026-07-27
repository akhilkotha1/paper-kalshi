import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/markets", label: "Markets" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/profile", label: "Profile" },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white p-4 flex flex-col gap-6">
      <div className="flex items-center gap-2 px-2 py-2">
        <span className="text-green-600 text-xl">📈</span>
        <span className="font-semibold text-lg text-gray-900">Paper Kalshi</span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-xl bg-green-50 p-4 text-center">
        <p className="text-sm font-medium text-gray-900">100% Free. No real money.</p>
        <p className="text-xs text-gray-500 mt-1">
          This is a simulated trading platform for entertainment purposes only.
        </p>
      </div>
    </aside>
  );
}
