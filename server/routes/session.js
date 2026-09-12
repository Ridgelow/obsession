import { Router } from "express";
import { randomUUID } from "crypto";
import { pool } from "../db.js";
import { recallPatterns } from "../backboard.js";

export const sessionRouter = Router();

// Called when the user taps "Begin a practice date" on Home.
// Pulls Backboard's memory of past sessions (for the recap card + to seed
// the date's persona) and opens a new session row in Tiger Data.
sessionRouter.post("/session/start", async (req, res) => {
  const { userId, scenario = "first_date" } = req.body;
  const sessionId = randomUUID();

  let patterns = null;
  try {
    const recall = await recallPatterns(
      "Summarize in one sentence what this person tends to struggle with on practice dates."
    );
    patterns = recall?.message ?? null;
  } catch {
    // Backboard has no memory yet for a first-ever session — that's fine.
  }

  await pool.query(
    `INSERT INTO sessions (id, user_id, scenario) VALUES ($1, $2, $3)`,
    [sessionId, userId, scenario]
  );

  res.json({ sessionId, priorPatterns: patterns });
});

sessionRouter.post("/session/:id/baseline", async (req, res) => {
  const { heartRate } = req.body;
  await pool.query(`UPDATE sessions SET hr_baseline = $1 WHERE id = $2`, [
    heartRate,
    req.params.id,
  ]);
  res.sendStatus(204);
});

sessionRouter.post("/session/:id/end", async (req, res) => {
  await pool.query(`UPDATE sessions SET ended_at = now() WHERE id = $1`, [req.params.id]);
  res.sendStatus(204);
});
