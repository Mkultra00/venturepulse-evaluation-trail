import { STAGES, type StageId } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function Workflow({ current, running }: { current: StageId; running: boolean }) {
  const idx = STAGES.findIndex((s) => s.id === current);
  return (
    <ol className="grid grid-cols-7 gap-1">
      {STAGES.map((s, i) => {
        const state = i < idx ? "done" : i === idx ? "now" : "todo";
        return (
          <li key={s.id} className="relative">
            <div className={cn("h-1.5 rounded-full mb-2 transition-colors",
              state === "done" && "bg-primary",
              state === "now" && (running ? "bg-accent animate-pulse" : "bg-accent"),
              state === "todo" && "bg-muted")} />
            <div className={cn("text-xs font-semibold", state === "todo" ? "text-muted-foreground" : "text-foreground")}>
              {i + 1}. {s.label}
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden md:block">{s.hint}</div>
            {state === "now" && (
              <div className="mt-1 inline-block rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono text-accent-foreground">
                ◉ applicant here
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
