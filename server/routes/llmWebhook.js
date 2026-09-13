import { Router } from "express";
import {
  getLastTurn,
  getLatestTelemetry,
  getSession,
  insertTurn,
} from "../db.js";
import { fallbackDateLine, nextDateLine } from "../gemini.js";
import { NERVES_THRESHOLD_BPM } from "../config.js";
import {
  asyncRoute,
  extractMessageText,
  resolveSessionId,
  sanitizePriorPatterns,
} from "../util.js";

export const llmWebhookRouter = Router();

function sseBase(model = "obsession-brain") {
  const created = Math.floor(Date.now() / 1000);
  return {
    id: `chatcmpl-${created}`,
    object: "chat.completion.chunk",
    created,
    model,
  };
}

function writeChunk(res, base, delta, finishReason = null) {
  res.write(
    `data: ${JSON.stringify({
      ...base,
      choices: [
        {
          index: 0,
          delta,
          finish_reason: finishReason,
        },
      ],
    })}\n\n`
  );
  if (typeof res.flush === "function") res.flush();
}

function openSse(res) {
  // Flush headers immediately so ElevenLabs cascade_timeout doesn't fire
  // while Gemini is still thinking.
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  try {
    res.socket?.setNoDelay?.(true);
  } catch {
    // optional
  }
  if (typeof res.flush === "function") res.flush();
}

function finishSse(res, base) {
  writeChunk(res, base, {}, "stop");
  res.write("data: [DONE]\n\n");
  res.end();
}

function streamText(res, base, text) {
  const chunks =
    String(text || "").match(/.{1,24}(\s|$)/g) || [String(text || "")];
  for (const piece of chunks) {
    if (!piece) continue;
    writeChunk(res, base, { content: piece });
  }
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

/**
 * ElevenLabs Custom LLM: must start SSE *before* Gemini, or cascade_timeout
 * (~4s) kills the room with custom_llm_error — then the RN client reconnects
 * and the agent repeats first_message.
 */
async function handleChatCompletions(req, res) {
  const body = req.body || {};
  const { messages } = body;
  const sessionId = resolveSessionId(body);
  const history = toHistory(messages);

  openSse(res);
  const base = sseBase(body.model || "obsession-brain");
  // Role + buffer words so TTS has audio while Gemini thinks (EL docs).
  writeChunk(res, base, { role: "assistant", content: "" });
  writeChunk(res, base, { content: "Hmm... " });

  let latestSignal = null;
  let priorPatterns = null;
  let scenario = "first_date";
  let hr = { baseline: null, heartRate: null, delta: null, flagged: false };

  try {
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

    const text = await Promise.race([
      nextDateLine({
        history,
        latestSignal,
        priorPatterns,
        scenario,
      }),
      new Promise((resolve) =>
        setTimeout(
          () => resolve(fallbackDateLine({ latestSignal })),
          3500
        )
      ),
    ]);

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
      `[llm] session=${sessionId || "none"} signal=${latestSignal || "none"} chars=${String(text).length}`
    );
    streamText(res, base, text);
    finishSse(res, base);
  } catch (err) {
    console.error("[llm] webhook failed mid-stream:", err);
    const fallback = fallbackDateLine({ latestSignal });
    streamText(res, base, fallback);
    finishSse(res, base);
  }
}

const chatHandler = asyncRoute(async (req, res) => {
  console.log(
    `[llm] POST ${req.path} session=${resolveSessionId(req.body || {}) || "none"} msgs=${(req.body?.messages || []).length}`
  );
  try {
    await handleChatCompletions(req, res);
  } catch (err) {
    console.error("[llm] webhook failed:", err);
    if (!res.headersSent) {
      openSse(res);
      const base = sseBase();
      writeChunk(res, base, { role: "assistant", content: "" });
      streamText(
        res,
        base,
        "You seem a little thrown — want to stay with that, or switch topics?"
      );
      finishSse(res, base);
    }
  }
});

llmWebhookRouter.post("/llm/chat/completions", chatHandler);
llmWebhookRouter.post("/v1/chat/completions", chatHandler);
