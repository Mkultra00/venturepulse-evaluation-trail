import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

const RUN_ID = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
    return res;
  };
}

export const assessmentSchema = z.object({
  summary: z.string(),
  kpiImpacts: z.array(
    z.object({
      kpi: z.string(),
      direction: z.enum(["up", "down", "flat", "unclear"]),
      rationale: z.string(),
    }),
  ),
  redFlags: z.array(z.string()),
  followUps: z.array(z.string()),
  confidence: z.enum(["low", "medium", "high"]),
  note: z.string(),
});
export type Assessment = z.infer<typeof assessmentSchema>;

const INSTRUCTIONS = `You are an analyst helping venture investors evaluate a seed startup over time.
Given the latest known KPIs and a founder's progress update, assess how the update likely affects each KPI (ARR, NRR, burn multiple, gross margin, week-8 retention, FTE) and any others it mentions.
Rules: never invent numbers not in the update; mark direction "unclear" when evidence is thin; flag claims that conflict with the prior KPIs or are unverifiable; give 2-4 concrete follow-up questions.
"note" is a 3-5 sentence evaluation note for the partner file. You inform; a human partner decides.`;

export async function assessUpdate(apiKey: string, startup: string, kpis: string, update: string) {
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: `Startup: ${startup}\nLatest KPIs: ${kpis}\n\nFounder progress update:\n${update}` }],
    output: Output.object({ schema: assessmentSchema }),
    maxRetries: 0,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    return { ok: true as const, assessment: await result.output };
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) return { ok: false as const, error: "The AI response could not be read. Please try again." };
    const status = (e as { statusCode?: number }).statusCode;
    console.error("assessUpdate failed", status, e);
    if (status === 402) return { ok: false as const, error: "AI credits are used up. Add credits in Settings → Plans & credits." };
    if (status === 429) return { ok: false as const, error: "Too many requests right now — wait a moment and try again." };
    if (status === 403) return { ok: false as const, error: "AI access is blocked for this workspace." };
    return { ok: false as const, error: "AI assessment failed. Please try again." };
  }
}
