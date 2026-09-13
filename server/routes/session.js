import { Router } from "express";
import { randomUUID } from "crypto";
import { getSession, insertSession, insertTurn, updateSession } from "../db.js";
import { recallPatterns } from "../backboard.js";
import { asyncRoute, httpError, normalizeScenario, sanitizePriorPatterns } from "../util.js";

export const sessionRouter = Router();

// Called when the user taps "Begin a practice date" on Home.
// Pulls Backboard's memory of past sessions (for the recap card + to seed
// the date's persona) and opens a new session row in Tiger Data.
sessionRouter.post(
  "/session/start",
  asyncRoute(async (req, res) => {
    const userId = req.body?.userId || "demo-user";
    const scenario = normalizeScenario(req.body?.scenario);
    const sessionId = randomUUID();

    let patterns = null;
    try {
      const recall = await recallPatterns(
        "Summarize in one sentence what this person tends to struggle with on practice dates. If you remember nothing, reply with an empty string."
      );
      patterns = sanitizePriorPatterns(recall?.message);
    } catch (err) {
      // Backboard has no memory yet / billing limits — keep Home on fallback copy.
      console.warn("[session] Backboard recall skipped:", err.message);
    }

    await insertSession({
      id: sessionId,
      userId,
      scenario,
      priorPatterns: patterns,
    });

    res.json({ sessionId, priorPatterns: patterns });
  })
);

sessionRouter.post(
  "/session/:id/baseline",
  asyncRoute(async (req, res) => {
    const heartRate = Number(req.body?.heartRate);
    if (!Number.isFinite(heartRate)) {
      throw httpError(400, "heartRate is required");
    }
    const session = await getSession(req.params.id);
    if (!session) throw httpError(404, "session not found");

    await updateSession(req.params.id, { hr_baseline: heartRate });
    res.sendStatus(204);
  })
);

sessionRouter.post(
  "/session/:id/end",
  asyncRoute(async (req, res) => {
    const session = await getSession(req.params.id);
    if (!session) throw httpError(404, "session not found");
    await updateSession(req.params.id, { ended_at: new Date() });
    res.sendStatus(204);
  })
);

/**
 * Upload the live voice transcript (ElevenLabs hosted LLM path does not
 * hit our Custom LLM webhook, so turns never landed in Tiger without this).
 * Body: { turns: [{ speaker: "user"|"ai"|"agent", text: string }] }
 */
sessionRouter.post(
  "/session/:id/turns",
  asyncRoute(async (req, res) => {
    const session = await getSession(req.params.id);
    if (!session) throw httpError(404, "session not found");

    const raw = Array.isArray(req.body?.turns) ? req.body.turns : [];
    let inserted = 0;
    for (const row of raw) {
      const text = String(row?.text ?? "").trim();
      if (!text) continue;
      const role = String(row?.speaker ?? row?.role ?? "").toLowerCase();
      const speaker =
        role === "user" || role === "you" ? "user" : "ai";
      await insertTurn({
        sessionId: req.params.id,
        speaker,
        text,
      });
      inserted += 1;
    }
    console.log(
      `[session] turns uploaded session=${req.params.id} count=${inserted}`
    );
    res.json({ inserted });
  })
);
