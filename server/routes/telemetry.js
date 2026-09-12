import { Router } from "express";
import {
  getLatestTelemetry,
  getSession,
  insertTelemetry,
  listTurns,
} from "../db.js";
import { NERVES_THRESHOLD_BPM } from "../config.js";
import { asyncRoute, formatElapsed, httpError } from "../util.js";

export const telemetryRouter = Router();

function computeDelta(heartRate, baseline) {
  if (baseline == null || !Number.isFinite(Number(baseline))) return 0;
  return heartRate - Number(baseline);
}

// The mobile app calls this every couple of seconds with whatever the Presage
// SDK (or the vitals simulator) just measured. Write side of Tiger Data.
telemetryRouter.post(
  "/session/:id/telemetry",
  asyncRoute(async (req, res) => {
    const heartRate = Number(req.body?.heartRate);
    if (!Number.isFinite(heartRate)) {
      throw httpError(400, "heartRate is required");
    }

    const sessionId = req.params.id;
    const session = await getSession(sessionId);
    if (!session) throw httpError(404, "session not found");

    const breathingRate =
      req.body?.breathingRate == null ? null : Number(req.body.breathingRate);
    const engagement =
      req.body?.engagement == null ? null : Number(req.body.engagement);
    const source = req.body?.source || "presage";

    await insertTelemetry({
      sessionId,
      heartRate,
      breathingRate: Number.isFinite(breathingRate) ? breathingRate : null,
      engagement: Number.isFinite(engagement) ? engagement : null,
      source,
    });

    const delta = computeDelta(heartRate, session.hr_baseline);
    const flagged = Math.abs(delta) >= NERVES_THRESHOLD_BPM;
    res.json({ delta: Math.round(delta), flagged });
  })
);

// Read side: Results timeline. Array of turns with time / speaker / text /
// hr_delta / flagged — `time` is elapsed from session start (e.g. "0:42").
telemetryRouter.get(
  "/session/:id/timeline",
  asyncRoute(async (req, res) => {
    const session = await getSession(req.params.id);
    if (!session) throw httpError(404, "session not found");

    const turns = await listTurns(req.params.id);
    const latest = await getLatestTelemetry(req.params.id);

    res.json(
      turns.map((turn) => ({
        time: formatElapsed(session.started_at, turn.time),
        speaker: turn.speaker,
        text: turn.text,
        hr_delta: turn.hr_delta == null ? null : Number(turn.hr_delta),
        flagged: Boolean(turn.flagged),
        // extras the client can ignore
        at: turn.time,
        latest_hr: latest?.heart_rate ?? null,
      }))
    );
  })
);
