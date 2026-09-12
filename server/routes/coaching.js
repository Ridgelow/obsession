import { Router } from "express";
import { pool } from "../db.js";
import { coachSession } from "../gemini.js";
import { rememberSession } from "../backboard.js";

export const coachingRouter = Router();

// Called when the date ends, right before the Results screen loads.
coachingRouter.post("/session/:id/coach", async (req, res) => {
  const sessionId = req.params.id;

  const { rows: turns } = await pool.query(
    `SELECT speaker, text, flagged FROM conversation_turns
     WHERE session_id = $1 ORDER BY time ASC`,
    [sessionId]
  );

  const transcriptWithSignals = turns
    .map((t) => (t.flagged ? `[HR SPIKE] ${t.speaker}: ${t.text}` : `${t.speaker}: ${t.text}`))
    .join("\n");

  const result = await coachSession({ transcriptWithSignals });

  await pool.query(`UPDATE sessions SET scores = $1, ended_at = now() WHERE id = $2`, [
    result.scores,
    sessionId,
  ]);

  // Feed a short summary back into Backboard so the NEXT session's Home
  // screen recap and Gemini system prompt know what to work on.
  await rememberSession(
    `Practice date scores — chemistry ${result.scores.chemistry}, conversation ` +
      `${result.scores.conversation}, composure ${result.scores.composure}, curiosity ` +
      `${result.scores.curiosity}. Key moment: ${result.keyMoment}`
  );

  res.json(result);
});
