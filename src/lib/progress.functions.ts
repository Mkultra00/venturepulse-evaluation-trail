import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const assessProgress = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ startup: z.string().max(200), kpis: z.string().max(1000), update: z.string().min(20).max(6000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env["NINOO_API_KEY"];
    const base = process.env["NINOO_BASE_URL"];
    if (!key || !base) return { ok: false as const, error: "AI is not configured." };
    const { assessUpdate } = await import("./progress.server");
    return assessUpdate(key, base, data.startup, data.kpis, data.update);
  });
