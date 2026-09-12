import { Router } from "express";
import {
  getLastTurn,
  getLatestTelemetry,
  getSession,
  insertTurn,
} from "../db.js";
import { nextDateLine } from "../gemini.js";
import { NERVES_THRESHOLD_BPM } from "../config.js";
import {
  asyncRoute,
  extractMessageText,
  resolveSessionId,
  sanitizePriorPatterns,
} from "../util.js";

export const llmWebhookRouter = Router();

function writeSse(res, text) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(
    `data: ${JSON.stringify({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ delta: { content: text } }],
    })}\n\n`
  );
  res.write("data: [DONE]\n\n");
  res.end();
}

function toHistory(messages = []) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      speaker: m.role === "assistant" ? "ai" : "user",
      text: extractMessageText(m.content),
    }))
    .filter((turn) => turn.text);
}

async function maybeLogUserTurn(sessionId, history, hr) {
  const lastUser = [...history].reverse().find((t) => t.speaker === "user");
  if (!lastUser) return;
  const prev = await getLastTurn(sessionId);
  if (prev?.speaker === "user" && prev.text === lastUser.text) return;
  await insertTurn({
    sessionId,
    speaker: "user",
    text: lastUser.text,
    hrBaseline: hr.baseline,
    hrAtTurn: hr.heartRate,
    hrDelta: hr.delta,
    flagged: hr.flagged,
  });
}

async function handleChatCompletions(req, res) {
  const { messages } = req.body || {};
  const sessionId = resolveSessionId(req.body || {});
  const history = toHistory(messages);

  let latestSignal = null;
  let priorPatterns = null;
  let scenario = "first_date";
  let hr = { baseline: null, heartRate: null, delta: null, flagged: false };

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      scenario = session.scenario || "first_date";
      priorPatterns = sanitizePriorPatterns(session.prior_patterns);
      const latest = await getLatestTelemetry(sessionId);
      const baseline = session.hr_baseline;
      if (latest?.heart_rate != null && baseline != null) {
        const delta = Math.round(Number(latest.heart_rate) - Number(baseline));
        hr = {
          baseline: Number(baseline),
          heartRate: Number(latest.heart_rate),
          delta,
          flagged: Math.abs(delta) >= NERVES_THRESHOLD_BPM,
        };
        if (hr.flagged) {
          latestSignal = `heart rate ${delta > 0 ? "jumped" : "dropped"} ${Math.abs(delta)}bpm on this question`;
        }
      }
      await maybeLogUserTurn(sessionId, history, hr);
    } else {
      console.warn("[llm] unknown sessionId", sessionId);
    }
  }

  const text = await nextDateLine({
    history,
    latestSignal,
    priorPatterns,
    scenario,
  });

  if (sessionId) {
    await insertTurn({
      sessionId,
      speaker: "ai",
      text,
      hrBaseline: hr.baseline,
      hrAtTurn: hr.heartRate,
      hrDelta: hr.delta,
      flagged: Boolean(latestSignal),
    });
  }

  console.log(
    `[llm] session=${sessionId || "none"} signal=${latestSignal || "none"}`
  );
  writeSse(res, text);
}

// ElevenLabs Agent → Custom LLM (OpenAI-compatible SSE).
// Agent dashboard URL: https://<host>/llm/chat/completions
// Some agents POST /v1/chat/completions — we accept both.
const chatHandler = asyncRoute(async (req, res) => {
  try {
    await handleChatCompletions(req, res);
  } catch (err) {
    console.error("[llm] webhook failed:", err);
    if (!res.headersSent) {
      writeSse(
        res,
        "You seem a little thrown — want to stay with that, or switch topics?"
      );
    }
  }
});

llmWebhookRouter.post("/llm/chat/completions", chatHandler);
llmWebhookRouter.post("/v1/chat/completions", chatHandler);
