export function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function httpError(status, message, hint) {
  const err = new Error(message);
  err.status = status;
  if (hint) err.hint = hint;
  return err;
}

// Home pills are "First Date" | "Coffee Chat" | "Silence";
// the API contract uses snake_case scenario keys.
export function normalizeScenario(raw) {
  const key = String(raw || "first_date")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (key === "coffee" || key === "coffee_chat") return "coffee_chat";
  if (key === "silence" || key === "awkward_silence") return "silence";
  return "first_date";
}

export function formatElapsed(startedAt, at = new Date()) {
  const start = startedAt ? new Date(startedAt).getTime() : NaN;
  const end = new Date(at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "0:00";
  const sec = Math.max(0, Math.floor((end - start) / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function extractMessageText(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.text) return part.text;
        if (part?.content) return extractMessageText(part.content);
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  if (typeof content === "object" && content.text) return String(content.text);
  return String(content);
}

export function resolveSessionId(body = {}) {
  const extra = body.elevenlabs_extra_body || body.custom_llm_extra_body || {};
  const dyn = body.dynamic_variables || {};
  return (
    extra.sessionId ||
    extra.session_id ||
    dyn.session_id ||
    dyn.sessionId ||
    body.sessionId ||
    null
  );
}

export function parseJsonLoose(text) {
  if (text == null) throw new Error("empty JSON");
  if (typeof text === "object") return text;
  const trimmed = String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(trimmed);
}
