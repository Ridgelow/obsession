import { Router } from "express";
import { pool } from "../db.js";
import { nextDateLine } from "../gemini.js";

export const llmWebhookRouter = Router();

// This is the "custom LLM" endpoint you paste into the ElevenLabs Agent config
// (Agent → LLM → Custom LLM → Server URL). ElevenLabs' agent handles turn-taking,
// speech-to-text and text-to-speech; on every AI turn it POSTs an OpenAI-
// compatible chat-completions request here, and expects an SSE stream back.
// See: https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm
//
// The mobile app passes `elevenlabs_extra_body: { sessionId }` when it starts
// the conversation (see mobile/services/elevenlabs.ts) — that's how this
// stateless HTTP endpoint knows which Tiger Data session to read telemetry from.
llmWebhookRouter.post("/llm/chat/completions", async (req, res) => {
  const { messages, elevenlabs_extra_body, dynamic_variables } = req.body;
  // Accept either path — confirm which one your SDK/agent version actually
  // sends by logging req.body once during setup and adjusting if needed.
  const sessionId = elevenlabs_extra_body?.sessionId || dynamic_variables?.session_id;

  const history = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ speaker: m.role === "assistant" ? "ai" : "user", text: m.content }));

  // Pull the latest telemetry row + the session's baseline to describe the
  // physiological deviation, if any, as a plain-language signal for Gemini.
  let latestSignal = null;
  if (sessionId) {
    const { rows } = await pool.query(
      `SELECT t.heart_rate, s.hr_baseline
       FROM telemetry t JOIN sessions s ON s.id = t.session_id
       WHERE t.session_id = $1 ORDER BY t.time DESC LIMIT 1`,
      [sessionId]
    );
    if (rows[0]?.hr_baseline) {
      const delta = Math.round(rows[0].heart_rate - rows[0].hr_baseline);
      if (Math.abs(delta) >= 12) {
        latestSignal = `heart rate ${delta > 0 ? "jumped" : "dropped"} ${Math.abs(delta)}bpm on this question`;
      }
    }
  }

  const text = await nextDateLine({ history, latestSignal });

  // Log this AI turn into Tiger Data so the Results timeline can show it later.
  if (sessionId) {
    await pool.query(
      `INSERT INTO conversation_turns (session_id, speaker, text, hr_delta, flagged)
       VALUES ($1, 'ai', $2, $3, $4)`,
      [sessionId, text, null, !!latestSignal]
    );
  }

  // Respond as a single SSE chunk (non-streaming is fine — ElevenLabs just
  // needs valid SSE framing, not token-by-token streaming, to work correctly).
  res.setHeader("Content-Type", "text/event-stream");
  res.write(
    `data: ${JSON.stringify({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ delta: { content: text }, index: 0, finish_reason: null }],
    })}\n\n`
  );
  res.write(
    `data: ${JSON.stringify({
      id: "chatcmpl-1",
      object: "chat.completion.chunk",
      choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
    })}\n\n`
  );
  res.write("data: [DONE]\n\n");
  res.end();
});
