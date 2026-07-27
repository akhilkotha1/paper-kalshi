import { Link } from "react-router-dom";

const features = [
  {
    icon: "💵",
    title: "Free to Play",
    body: "Start with $10,000 in fake cash. No deposits, no fees, no risk.",
  },
  {
    icon: "📊",
    title: "Real Markets",
    body: "Trade on real-world events like sports, politics, finance, and more.",
  },
  {
    icon: "🏆",
    title: "Compete & Climb",
    body: "Compete on leaderboards and prove you're the top predictor.",
  },
  {
    icon: "🔍",
    title: "Learn & Explore",
    body: "Sharpen your forecasting skills and have fun doing it with friends.",
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-xl">📈</span>
          <span className="font-semibold text-lg text-gray-900">Paper Kalshi</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm text-gray-600">
          <Link to="/markets">Markets</Link>
          <a href="#how-it-works">How it Works</a>
          <Link to="/leaderboard">Leaderboard</Link>
        </nav>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700"
          >
            Log in
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white"
          >
            Sign up
          </Link>
        </div>
      </header>

      <section className="bg-green-50 px-8 py-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold text-gray-900 leading-tight">
            Trade predictions.
            <br />
            <span className="text-green-600">Not real money.</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-xl">
            Paper Kalshi is a free prediction market platform where you trade
            with fake money, compete with friends, and test your knowledge.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              to="/login"
              className="rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white"
            >
              Get Started
            </Link>
            <Link
              to="/markets"
              className="rounded-lg border border-green-600 px-6 py-3 text-sm font-semibold text-green-700"
            >
              Explore Markets
            </Link>
          </div>
          <p className="mt-6 inline-block rounded-lg border border-green-200 bg-white px-4 py-2 text-sm text-green-700">
            🛡️ 100% free. No real money. Just for fun.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="px-8 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          Why Paper Kalshi?
        </h2>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {features.map((f) => (
            <div key={f.title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-2xl">
                {f.icon}
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-8 mb-8 rounded-lg bg-green-50 px-6 py-4 text-center text-sm text-gray-700">
        This is a simulated trading platform for entertainment and educational
        purposes only. <strong>No real money can be deposited or won.</strong>
      </div>
    </div>
  );
}
