// Thin wrapper around Backboard's REST API.
// Backboard's memory model: memories live at the ASSISTANT level, not per-user —
// so every call for this product passes the same BACKBOARD_ASSISTANT_ID and the
// per-turn `memory` parameter controls whether that call reads/writes it.
// Docs: https://docs.backboard.io/sdk/quickstart , /sdk/memory

const BASE_URL = "https://api.backboard.io/v1";

async function backboardFetch(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BACKBOARD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Backboard ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Read-only: pull whatever the assistant already remembers about this person's
// past practice dates, for the Home screen's "From last session" card and to
// seed the Gemini system prompt with prior patterns.
export async function recallPatterns(prompt) {
  return backboardFetch("/messages", {
    assistant_id: process.env.BACKBOARD_ASSISTANT_ID,
    message: prompt,
    memory: "Readonly",
  });
}

// Write: called once at the end of a session with a short, structured summary
// of what happened, so future sessions can recall it.
export async function rememberSession(summaryText) {
  return backboardFetch("/messages", {
    assistant_id: process.env.BACKBOARD_ASSISTANT_ID,
    message: summaryText,
    memory: "Auto", // Auto both saves this turn and lets future calls retrieve it
  });
}
