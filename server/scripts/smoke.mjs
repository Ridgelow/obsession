// Phase A acceptance: start → baseline → spiked telemetry → Custom LLM
// SIGNAL line → end → coach + timeline shapes.
//
//   cd server && npm run dev     # other terminal
//   npm run smoke

const BASE = process.env.SMOKE_URL || "http://localhost:8787";

function fail(msg, extra) {
  console.error("SMOKE FAIL:", msg, extra || "");
  process.exit(1);
}

async function json(path, { method = "GET", body, ok = [200] } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!ok.includes(res.status)) {
    fail(`${method} ${path} → ${res.status}`, text);
  }
  return text ? JSON.parse(text) : null;
}

const health = await json("/health");
console.log("health", health);

const started = await json("/session/start", {
  method: "POST",
  body: { userId: "demo-user", scenario: "first_date" },
});
if (!started?.sessionId) fail("start missing sessionId", started);
const sid = started.sessionId;
console.log("session", sid, "priorPatterns", started.priorPatterns);

const baselineRes = await fetch(`${BASE}/session/${sid}/baseline`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ heartRate: 71 }),
});
if (baselineRes.status !== 204) fail("baseline not 204", baselineRes.status);

const tel = await json(`/session/${sid}/telemetry`, {
  method: "POST",
  body: { heartRate: 89, breathingRate: 14, engagement: 0.6 },
});
if (tel.delta !== 18 || tel.flagged !== true) fail("telemetry flag", tel);
console.log("telemetry", tel);

const llmRes = await fetch(`${BASE}/llm/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [{ role: "user", content: "why did your last relationship end?" }],
    elevenlabs_extra_body: { sessionId: sid },
    dynamic_variables: { session_id: sid },
  }),
});
const sse = await llmRes.text();
console.log("sse\n", sse);
if (!sse.includes("chatcmpl-1") || !sse.includes("[DONE]")) {
  fail("SSE framing", sse);
}
if (!/thrown|nerve|shift/i.test(sse)) {
  fail("expected adaptive SIGNAL copy", sse);
}

const endRes = await fetch(`${BASE}/session/${sid}/end`, { method: "POST" });
if (endRes.status !== 204) fail("end not 204", endRes.status);

const coach = await json(`/session/${sid}/coach`, { method: "POST" });
for (const key of ["chemistry", "conversation", "composure", "curiosity"]) {
  if (typeof coach?.scores?.[key] !== "number") fail(`coach.scores.${key}`, coach);
}
if (!coach.keyMoment || !coach.coaching) fail("coach shape", coach);
console.log("coach", coach);

const timeline = await json(`/session/${sid}/timeline`);
if (!Array.isArray(timeline) || timeline.length < 1) fail("timeline array", timeline);
const flagged = timeline.some((t) => t.flagged);
if (!flagged) fail("timeline missing flagged turn", timeline);
console.log("timeline", timeline);

console.log("SMOKE OK");
