export function Spark({ values, active }: { values: (number | null)[]; active: number }) {
  const nums = values.map((v) => v ?? 0);
  const max = Math.max(...nums, 1), min = Math.min(...nums, 0);
  const w = 120, h = 32;
  const pt = (v: number, i: number) => [
    (i / Math.max(1, values.length - 1)) * (w - 8) + 4,
    h - 4 - ((v - min) / (max - min || 1)) * (h - 8),
  ];
  const d = nums.map((v, i) => pt(v, i).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8">
      <polyline points={d} fill="none" className="stroke-primary" strokeWidth={1.5} />
      {nums.map((v, i) => {
        const [x, y] = pt(v, i);
        return <circle key={i} cx={x} cy={y} r={i === active ? 3.5 : 2} className={i === active ? "fill-accent" : "fill-primary"} />;
      })}
    </svg>
  );
}
