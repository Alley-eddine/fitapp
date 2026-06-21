interface Point {
  weight: number;
  loggedAt: string;
}

/**
 * Dependency-free SVG line chart for weight history. Expects points in any
 * order; renders them chronologically with min/max reference lines.
 */
export function WeightChart({ data }: { data: Point[] }) {
  const points = [...data].sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  );

  if (points.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        Logge au moins deux poids pour voir ta courbe d&apos;évolution.
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padX = 36;
  const padY = 20;

  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;

  const x = (i: number) => padX + (i / (points.length - 1)) * (width - 2 * padX);
  const y = (w: number) => padY + (1 - (w - min) / span) * (height - 2 * padY);

  const linePath = points.map((p, i) => `${String(x(i))},${String(y(p.weight))}`).join(" ");
  const areaPath = `${String(padX)},${String(height - padY)} ${linePath} ${String(width - padX)},${String(height - padY)}`;

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const delta = last.weight - first.weight;

  return (
    <div>
      <svg viewBox={`0 0 ${String(width)} ${String(height)}`} className="w-full" role="img" aria-label="Courbe de poids">
        {/* min / max reference lines */}
        {[max, min].map((w) => (
          <g key={w}>
            <line x1={padX} y1={y(w)} x2={width - padX} y2={y(w)} stroke="#1e293b" strokeWidth={1} />
            <text x={4} y={y(w) + 4} fontSize={11} fill="#64748b">
              {w.toFixed(1)}
            </text>
          </g>
        ))}
        <polygon points={areaPath} fill="#22d3ee" fillOpacity={0.08} />
        <polyline points={linePath} fill="none" stroke="#22d3ee" strokeWidth={2} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={p.loggedAt} cx={x(i)} cy={y(p.weight)} r={3} fill="#22d3ee" />
        ))}
      </svg>
      <p className="mt-2 text-center text-sm text-slate-400">
        {delta === 0 ? (
          "Stable sur la période"
        ) : (
          <>
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} kg sur la période
          </>
        )}
      </p>
    </div>
  );
}
