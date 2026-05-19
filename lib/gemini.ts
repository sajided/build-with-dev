import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeminiChatResult, GeminiBlockPayload } from "@/lib/types";

const SCHEDULE_PROMPT = `You are VibeTime, an active Feel-Good Productivity Coach. Enforce Prioritization, Time Blocking, Focus, Follow-Through, and Energizing Work.

Rules:
- From the user's message, guide the conversation. If you still need non-work anchors (commute, gym, meals, classes, social), ask one clear question at a time before scheduling.
- You must converge on exactly ONE Daily Adventure (primary success metric) and TWO Side Quests: one health-related, one relationship-related.
- If the user insists they don't have enough time or over-schedules unrealistically, set coachingPriorityFlag to the exact phrase: It's not about time; it's about priority.
- Respond ONLY as valid JSON (no markdown) with this shape:
{
  "assistantMessage": "string addressed to user",
  "scheduleComplete": boolean,
  "coachingPriorityFlag": string|null,
  "dailyAdventure": string|null,
  "sideQuests": string[],
  "coachingMessage": string|null,
  "blocks": [
    {
      "taskName": "string",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "type": "work"|"health"|"social"|"anchor"|"break"
    }
  ]
}

Blocks must use 24-hour HH:MM, non-overlapping, realistic durations. Prefer same calendar day unless user specifies otherwise.

When anchors are unclear or adventure/side quests are not chosen yet, scheduleComplete MUST be false and blocks MAY be empty.
When schedule is finalized and anchored, scheduleComplete MUST be true, dailyAdventure and exactly two sideQuests populated, coachingMessage concise, blocks cover the day's plan.`;


function jsonFromModelText(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model response");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export function parseGeminiChatResult(payload: unknown): GeminiChatResult {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid Gemini payload");
  }
  const p = payload as Record<string, unknown>;
  const assistantMessage =
    typeof p.assistantMessage === "string" ? p.assistantMessage : "";

  let scheduleComplete =
    typeof p.scheduleComplete === "boolean" ? p.scheduleComplete : false;

  const coachingPriorityFlag =
    typeof p.coachingPriorityFlag === "string" ? p.coachingPriorityFlag : null;

  const dailyAdventure =
    typeof p.dailyAdventure === "string" ? p.dailyAdventure : null;

  const sideQuests = Array.isArray(p.sideQuests)
    ? p.sideQuests.filter((s): s is string => typeof s === "string")
    : [];

  const coachingMessage =
    typeof p.coachingMessage === "string" ? p.coachingMessage : null;

  const allowedTypes = new Set([
    "work",
    "health",
    "social",
    "anchor",
    "break",
  ]);

  const blocksRaw = Array.isArray(p.blocks) ? p.blocks : [];
  const blocks: GeminiBlockPayload[] = blocksRaw.flatMap((b) => {
    if (!b || typeof b !== "object") return [];
    const o = b as Record<string, unknown>;
    const taskName =
      typeof o.taskName === "string" ? o.taskName.trim() : "";
    const startTime =
      typeof o.startTime === "string" ? o.startTime : "";
    const endTime =
      typeof o.endTime === "string" ? o.endTime : "";
    if (!taskName || !startTime || !endTime) return [];
    const type =
      typeof o.type === "string" && allowedTypes.has(o.type)
        ? (o.type as GeminiBlockPayload["type"])
        : "work";
    return [{ taskName, startTime, endTime, type }];
  });

  /* Heuristic: if coach filled blocks with adventure/tags, insist complete stays false until explicit */
  if (scheduleComplete && (!dailyAdventure || sideQuests.length < 2)) {
    scheduleComplete = false;
  }

  return {
    assistantMessage: assistantMessage || "Proceed.",
    scheduleComplete,
    coachingPriorityFlag,
    dailyAdventure,
    sideQuests,
    coachingMessage,
    blocks,
  };
}

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(key);
}

/** Order: explicit primary, FALLBACKS, then common alternates so 429/free-tier quotas can spill over. */
function getModelCandidates(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim();
  const extra =
    process.env.GEMINI_MODEL_FALLBACKS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const chain = [
    ...(primary ? [primary] : []),
    ...extra,
    /** Default when GEMINI_MODEL unset — prefer newer flash first */
    ...(primary ? [] : ["gemini-2.5-flash"]),
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];
  return [...new Set(chain)];
}

function looksLikeGeminiQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("429") ||
    /Too Many Requests/i.test(msg) ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function backoffMsFromError(e: unknown, attempt: number): number {
  const msg = e instanceof Error ? e.message : String(e);
  const retrySec = msg.match(/[Rr]etry in ([\d.]+)\s*s/i);
  if (retrySec) {
    return Math.min(120_000, Math.ceil(Number.parseFloat(retrySec[1]) * 1000) + 500);
  }
  return Math.min(60_000, 2500 * 2 ** attempt);
}

/**
 * Retry same model on 429/quota a few times, then try next model ID.
 */
async function generateWithModelFallback<TResult>(
  generate: (modelId: string) => Promise<TResult>,
): Promise<TResult> {
  const models = getModelCandidates();
  const errors: string[] = [];

  for (const modelId of models) {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await generate(modelId);
      } catch (e) {
        const msg =
          e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        if (looksLikeGeminiQuotaError(e) && attempt < 3) {
          await sleep(backoffMsFromError(e, attempt));
          continue;
        }
        if (looksLikeGeminiQuotaError(e)) {
          errors.push(`[${modelId}] quota/rate (${msg.slice(0, 200)})`);
          break;
        }
        throw e;
      }
    }
  }

  throw new Error(
    `Gemini exhausted all models (${models.join(", ")}). Last errors: ${errors.join(" | ") || "unknown"}`,
  );
}

async function fetchJsonText(prompt: string, generationConfig: {
  temperature: number;
  maxOutputTokens: number;
  responseMimeType: string;
}) {
  const text = await generateWithModelFallback(async (modelId: string) => {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: modelId,
      generationConfig,
    });
    const result = await model.generateContent(prompt);
    const out =
      typeof result.response.text === "function"
        ? result.response.text()
        : "";
    if (!out.trim()) throw new Error("Empty Gemini response");
    return out;
  });
  return text;
}

export async function runCoachConversation(
  history: { role: "user" | "assistant"; content: string }[],
): Promise<GeminiChatResult> {
  const historyText = history
    .slice(-40)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = `${SCHEDULE_PROMPT}\n\nConversation so far:\n${historyText}\nRespond with JSON.`;

  const text = await fetchJsonText(prompt, {
    temperature: 0.6,
    maxOutputTokens: 2048,
    responseMimeType: "application/json",
  });

  try {
    return parseGeminiChatResult(JSON.parse(text));
  } catch {
    return parseGeminiChatResult(jsonFromModelText(text));
  }
}

const BREAKDOWN_PROMPT = `You break tasks into ultra-small next actions as JSON ONLY:
{ "assistantMessage": string, "microActions": string[] }

Each microAction is one tangible step (~1–5 minutes). Max 12 items.`;


export async function runMakeItSmaller(taskName: string): Promise<string[]> {
  const text = await fetchJsonText(
    `${BREAKDOWN_PROMPT}\n\nTask: "${taskName}"`,
    {
      temperature: 0.4,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text || "{}");
  } catch {
    parsed = jsonFromModelText(text);
  }
  if (!parsed || typeof parsed !== "object") return [];
  const micro = (parsed as { microActions?: unknown }).microActions;
  return Array.isArray(micro)
    ? micro.filter((m): m is string => typeof m === "string" && m.length > 0)
    : [];
}

const RECEIPT_PROMPT =
  "You're VibeTime. Given day summary stats, reply with ONLY JSON shape { assistantMessage: string } — assistantMessage is a short brutalist thermal-receipt-style sign-off (2–4 sentences, max).";


export async function runReceiptCoach(summary: string): Promise<string> {
  const text = await fetchJsonText(
    `${RECEIPT_PROMPT}\n\nSUMMARY:\n${summary}`,
    {
      temperature: 0.7,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
    },
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text || "{}");
  } catch {
    parsed = jsonFromModelText(text);
  }
  if (parsed && typeof parsed === "object") {
    const msg = (parsed as { assistantMessage?: unknown }).assistantMessage;
    if (typeof msg === "string") return msg;
  }
  return "Day closed. Receipt stored.";
}
