// Client for server/ (Gemini + Tiger Data + Backboard). Keys stay on the server.
// Phase A Express listens on :8787. Override with EXPO_PUBLIC_API_URL
// (ngrok URL on a physical device; 10.0.2.2:8787 on Android emulator).

import {
  normalizeTimeline,
  type CoachResponse,
  type StartSessionResponse,
  type TelemetryReading,
  type TelemetryResponse,
  type TimelineTurn,
} from "./sessionHelpers";

export type {
  CoachResponse,
  CoachScores,
  StartSessionResponse,
  TelemetryReading,
  TelemetryResponse,
  TimelineTurn,
} from "./sessionHelpers";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"
).replace(/\/$/, "");

export function getApiBaseUrl(): string {
  return BASE_URL;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function assertOk(res: Response): void {
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}`);
  }
}

/** POST /session/start { userId, scenario } → { sessionId, priorPatterns } */
export async function startSession(
  userId: string,
  scenario = "first_date"
): Promise<StartSessionResponse> {
  const res = await request("/session/start", {
    method: "POST",
    body: JSON.stringify({ userId, scenario }),
  });
  assertOk(res);
  return res.json() as Promise<StartSessionResponse>;
}

/** POST /session/:id/baseline { heartRate } → 204 */
export async function setBaseline(
  sessionId: string,
  heartRate: number
): Promise<void> {
  const res = await request(`/session/${sessionId}/baseline`, {
    method: "POST",
    body: JSON.stringify({ heartRate }),
  });
  if (res.status !== 204) assertOk(res);
}

/** POST /session/:id/telemetry → { delta, flagged } */
export async function sendTelemetry(
  sessionId: string,
  reading: TelemetryReading
): Promise<TelemetryResponse> {
  const res = await request(`/session/${sessionId}/telemetry`, {
    method: "POST",
    body: JSON.stringify({
      heartRate: reading.heartRate,
      breathingRate: reading.breathingRate ?? 14,
      engagement: reading.engagement ?? 0.6,
    }),
  });
  assertOk(res);
  return res.json() as Promise<TelemetryResponse>;
}

/** GET /session/:id/timeline → turns with time, speaker, text, hr_delta, flagged */
export async function getTimeline(sessionId: string): Promise<TimelineTurn[]> {
  const res = await request(`/session/${sessionId}/timeline`);
  assertOk(res);
  return normalizeTimeline(await res.json());
}

/** POST /session/:id/end → 204 */
export async function endSession(sessionId: string): Promise<void> {
  const res = await request(`/session/${sessionId}/end`, { method: "POST" });
  if (res.status !== 204) assertOk(res);
}

/** POST /session/:id/coach → { scores, keyMoment, coaching } */
export async function coachSession(sessionId: string): Promise<CoachResponse> {
  const res = await request(`/session/${sessionId}/coach`, { method: "POST" });
  assertOk(res);
  return res.json() as Promise<CoachResponse>;
}

export async function endSessionAndCoach(
  sessionId: string
): Promise<CoachResponse> {
  try {
    await endSession(sessionId);
  } catch {
    // Still try coach — the session may already be marked ended.
  }
  return coachSession(sessionId);
}
