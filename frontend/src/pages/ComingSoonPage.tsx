// Temorarily reuse for any page where the backend route doesn't exist yet
// (Dashboard, Portfolio, Leaderboard, Transactions, Profile)
// Will become real pages once data source is built

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
        This page is coming soon — it needs a backend route that hasn't been
        built yet.
      </div>
    </div>
  );
}
