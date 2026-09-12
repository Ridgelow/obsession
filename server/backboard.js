// Thin wrapper around Backboard's REST API.
// Memories live at the ASSISTANT level — every call uses the same
// BACKBOARD_ASSISTANT_ID; the per-turn `memory` param controls read/write.
// Docs: https://docs.backboard.io/concepts/memory
//       https://docs.backboard.io/api-reference/threads/send-message
//
// If keys are missing we no-op with a warning so the rest of Phase A
// stays reviewable and curl-able.

import { hasBackboardKeys } from "./config.js";

const DEFAULT_BASE = "https://app.backboard.io/api";

function baseUrl() {
  return (process.env.BACKBOARD_API_URL || DEFAULT_BASE).replace(/\/$/, "");
}

function extractText(payload) {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.content ||
    payload.message ||
    payload.text ||
    payload.choices?.[0]?.message?.content ||
    payload.retrieved_memories?.[0]?.memory ||
    null
  );
}

async function backboardFetch(body) {
  if (!hasBackboardKeys()) {
    console.warn(
      "[backboard] BACKBOARD_API_KEY / BACKBOARD_ASSISTANT_ID unset — skipping"
    );
    return null;
  }

  const res = await fetch(`${baseUrl()}/threads/messages`, {
    method: "POST",
    headers: {
      // Dashboard keys authenticate as X-API-Key (Bearer returns 401 session).
      "X-API-Key": process.env.BACKBOARD_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistant_id: process.env.BACKBOARD_ASSISTANT_ID,
      stream: false,
      ...body,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Backboard /threads/messages failed: ${res.status} ${raw}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { content: raw };
  }
}

// Read-only: pull whatever the assistant already remembers about this person's
// past practice dates, for the Home screen's "From last session" card and to
// seed the Gemini system prompt with prior patterns.
export async function recallPatterns(prompt) {
  const data = await backboardFetch({
    content: prompt,
    memory: "Readonly",
  });
  if (!data) return null;
  const text = extractText(data);
  return text ? { message: String(text).trim(), raw: data } : null;
}

// Write: called once at the end of a session with a short, structured summary
// of what happened, so future sessions can recall it.
export async function rememberSession(summaryText) {
  const data = await backboardFetch({
    content: summaryText,
    memory: "Auto", // Auto both saves this turn and lets future calls retrieve it
  });
  return data;
}
