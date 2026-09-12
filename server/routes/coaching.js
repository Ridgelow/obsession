import { Router } from "express";
import { getSession, listTurns, updateSession } from "../db.js";
import { coachSession } from "../gemini.js";
import { rememberSession } from "../backboard.js";
import { asyncRoute, formatElapsed, httpError } from "../util.js";

export const coachingRouter = Router();

function buildTranscript(turns, startedAt) {
  return turns
    .map((t) => {
      const stamp = formatElapsed(startedAt, t.time);
      const spike =
        t.flagged && t.hr_delta != null
          ? `[HR SPIKE ${t.hr_delta > 0 ? "+" : ""}${Math.round(t.hr_delta)}bpm] `
          : t.flagged
            ? "[HR SPIKE] "
            : "";
      return `${stamp} ${spike}${t.speaker}: ${t.text}`;
    })
    .join("\n");
}

// Called when the date ends, right before the Results screen loads.
coachingRouter.post(
  "/session/:id/coach",
  asyncRoute(async (req, res) => {
    const sessionId = req.params.id;
    const session = await getSession(sessionId);
    if (!session) throw httpError(404, "session not found");

    const turns = await listTurns(sessionId);
    const transcriptWithSignals = buildTranscript(turns, session.started_at);
    const result = await coachSession({ transcriptWithSignals });

    await updateSession(sessionId, {
      scores: result.scores,
      ended_at: session.ended_at || new Date(),
    });

    try {
      await rememberSession(
        `Practice date scores — chemistry ${result.scores.chemistry}, conversation ` +
          `${result.scores.conversation}, composure ${result.scores.composure}, curiosity ` +
          `${result.scores.curiosity}. Key moment: ${result.keyMoment}. ` +
          `Coach note: ${result.coaching}`
      );
    } catch (err) {
      console.warn("[coach] Backboard save skipped:", err.message);
    }

    res.json({
      scores: result.scores,
      keyMoment: result.keyMoment,
      coaching: result.coaching,
    });
  })
);
