import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const assessProgress = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ startup: z.string().max(200), kpis: z.string().max(1000), update: z.string().min(20).max(6000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, error: "AI is not configured." };
    const { assessUpdate } = await import("./progress.server");
    return assessUpdate(key, data.startup, data.kpis, data.update);
  });
