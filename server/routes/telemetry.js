import { Router } from "express";
import { pool } from "../db.js";

export const telemetryRouter = Router();

const NERVES_THRESHOLD_BPM = 12; // tune live during rehearsal

// The mobile app calls this every couple of seconds with whatever the Presage
// SDK/API just measured. This is the write side of Tiger Data.
telemetryRouter.post("/session/:id/telemetry", async (req, res) => {
  const { heartRate, breathingRate, engagement } = req.body;
  const sessionId = req.params.id;

  await pool.query(
    `INSERT INTO telemetry (session_id, heart_rate, breathing_rate, engagement)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, heartRate, breathingRate, engagement]
  );

  const { rows } = await pool.query(`SELECT hr_baseline FROM sessions WHERE id = $1`, [
    sessionId,
  ]);
  const baseline = rows[0]?.hr_baseline;
  const delta = baseline ? heartRate - baseline : 0;
  const flagged = Math.abs(delta) >= NERVES_THRESHOLD_BPM;

  res.json({ delta: Math.round(delta), flagged });
});

// Read side: powers the Results screen timeline. Returns the full telemetry +
// conversation-turn series for a session, time-ordered, for the client to
// render as the timeline dots and the flagged "key moment" callout.
telemetryRouter.get("/session/:id/timeline", async (req, res) => {
  const sessionId = req.params.id;
  const turns = await pool.query(
    `SELECT time, speaker, text, hr_delta, flagged FROM conversation_turns
     WHERE session_id = $1 ORDER BY time ASC`,
    [sessionId]
  );
  res.json({ turns: turns.rows });
});
