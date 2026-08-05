// src/components/PriceChart.tsx
//
// A simple line chart drawn as raw SVG — no charting library
// installed, since a basic line is easy enough to draw by hand and
// it keeps your dependency list smaller. Plots yes/no price (in
// cents, 0-100) over time.

type PricePoint = {
  recordedAt: string;
  yesPriceCents: number | null;
  noPriceCents: number | null;
};

const WIDTH = 600;
const HEIGHT = 200;
const PADDING = 20;

function buildPath(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export function PriceChart({ data }: { data: PricePoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        Not enough price history yet — check back once the sync loop has run
        a few times.
      </div>
    );
  }

  const usableWidth = WIDTH - PADDING * 2;
  const usableHeight = HEIGHT - PADDING * 2;

  function toXY(index: number, priceCents: number) {
    const x = PADDING + (index / (data.length - 1)) * usableWidth;
    // price is 0-100 cents; invert y since SVG's origin is top-left
    const y = PADDING + usableHeight - (priceCents / 100) * usableHeight;
    return { x, y };
  }

  const yesPoints = data
    .map((d, i) => (d.yesPriceCents !== null ? toXY(i, d.yesPriceCents) : null))
    .filter((p): p is { x: number; y: number } => p !== null);

  const noPoints = data
    .map((d, i) => (d.noPriceCents !== null ? toXY(i, d.noPriceCents) : null))
    .filter((p): p is { x: number; y: number } => p !== null);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-48"
      preserveAspectRatio="none"
    >
      {/* gridlines at 0, 50, 100 cents */}
      {[0, 50, 100].map((mark) => {
        const y = PADDING + usableHeight - (mark / 100) * usableHeight;
        return (
          <line
            key={mark}
            x1={PADDING}
            y1={y}
            x2={WIDTH - PADDING}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      })}

      {yesPoints.length > 1 && (
        <path d={buildPath(yesPoints)} fill="none" stroke="#16a34a" strokeWidth={2} />
      )}
      {noPoints.length > 1 && (
        <path d={buildPath(noPoints)} fill="none" stroke="#dc2626" strokeWidth={2} />
      )}
    </svg>
  );
}
