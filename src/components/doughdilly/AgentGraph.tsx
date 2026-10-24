import { AGENTS, RUN_SCRIPT, type AgentId } from "@/lib/demo-data";

const EDGES: [AgentId, AgentId][] = [
  ["DILLY", "INTAKE"],
  ["INTAKE", "SCOUT"], ["INTAKE", "FOUNDER"], ["INTAKE", "METRICS"], ["INTAKE", "MEMORY"],
  ["SCOUT", "VERIFIER"], ["FOUNDER", "VERIFIER"], ["METRICS", "RUBRIC"], ["MEMORY", "RUBRIC"],
  ["VERIFIER", "SCORER"], ["RUBRIC", "SCORER"], ["SCORER", "AUDITOR"],
];

const pos = (id: AgentId) => AGENTS.find((a) => a.id === id)!;

export function AgentGraph({ step }: { step: number }) {
  const cur = step >= 0 ? RUN_SCRIPT[step]! : null;
  const done = new Set<AgentId>();
  RUN_SCRIPT.slice(0, Math.max(0, step)).forEach((s) => { done.add(s.from); if (s.to) done.add(s.to); });
  const toolActive = cur && !cur.to;

  return (
    <svg viewBox="0 0 860 410" className="w-full h-auto font-mono">
      {EDGES.map(([a, b]) => {
        const A = pos(a), B = pos(b);
        const live = cur && cur.from === a && cur.to === b;
        return (
          <line key={a + b} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            className={live ? "stroke-primary edge-live" : "stroke-border"} strokeWidth={live ? 3 : 1.5} />
        );
      })}
      {cur?.to && !EDGES.some(([a, b]) => a === cur.from && b === cur.to) && (
        <line x1={pos(cur.from).x} y1={pos(cur.from).y} x2={pos(cur.to).x} y2={pos(cur.to).y}
          className={cur.kind === "ok" ? "stroke-primary edge-live" : "stroke-accent edge-live"} strokeWidth={2.5} />
      )}
      {AGENTS.map((a) => {
        const active = cur && (cur.from === a.id || cur.to === a.id);
        const err = active && cur?.kind === "err";
        const cls = err ? "fill-destructive" : active ? "fill-primary" : done.has(a.id) ? "fill-secondary stroke-primary" : "fill-muted stroke-border";
        return (
          <g key={a.id}>
            {active && <circle cx={a.x} cy={a.y} r={26} className={err ? "fill-none stroke-destructive node-pulse" : "fill-none stroke-primary node-pulse"} strokeWidth={2} />}
            <circle cx={a.x} cy={a.y} r={24} className={cls} strokeWidth={1.5} />
            <text x={a.x} y={a.y + 4} textAnchor="middle" fontSize={8.5} fontWeight={600}
              className={active ? "fill-primary-foreground" : "fill-foreground"}>{a.id}</text>
            {a.tools.map((t, i) => {
              const tActive = toolActive && cur!.from === a.id;
              const ty = a.y + 40 + i * 15;
              return (
                <g key={t}>
                  <rect x={a.x - 34} y={ty - 9} width={68} height={13} rx={3}
                    className={tActive ? "fill-accent" : "fill-background stroke-border"} strokeWidth={1} />
                  <text x={a.x} y={ty + 1} textAnchor="middle" fontSize={7.5}
                    className={tActive ? "fill-accent-foreground" : "fill-muted-foreground"}>{t}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
