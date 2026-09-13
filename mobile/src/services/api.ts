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
  TelemetrySource,
  TimelineTurn,
} from "./sessionHelpers";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8787"
).replace(/\/$/, "");

export function getApiBaseUrl(): string {
  return BASE_URL;
}

const DEFAULT_TIMEOUT_MS = 8_000;

async function request(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...fetchInit,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(fetchInit.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function assertOk(res: Response): void {
  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText}`);
  }
}

export type PersonaAgeVerifyResult = {
  verified: boolean;
  reason?: string | null;
  age?: number;
  idDateOfBirth?: string;
  mock?: boolean;
  status?: string;
};

/**
 * POST /persona/verify-age { inquiryId, dateOfBirth } → server fetches the
 * completed Persona Inquiry and confirms the ID says 18+ and its birthdate
 * matches what the user typed. The mobile SDK alone can't do this — Persona
 * never exposes extracted ID fields to the client.
 */
export async function verifyAgeWithPersona(
  inquiryId: string,
  dateOfBirth: string
): Promise<PersonaAgeVerifyResult> {
  const res = await request("/persona/verify-age", {
    method: "POST",
    body: JSON.stringify({ inquiryId, dateOfBirth }),
  });
  assertOk(res);
  return res.json() as Promise<PersonaAgeVerifyResult>;
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
      source: reading.source ?? "simulator",
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

export type TranscriptTurnInput = {
  speaker: "user" | "ai" | "agent";
  text: string;
};

/** POST /session/:id/turns — sync live voice transcript into Tiger. */
export async function uploadTurns(
  sessionId: string,
  turns: TranscriptTurnInput[]
): Promise<{ inserted: number }> {
  const res = await request(`/session/${sessionId}/turns`, {
    method: "POST",
    body: JSON.stringify({ turns }),
  });
  assertOk(res);
  return res.json() as Promise<{ inserted: number }>;
}

/** POST /session/:id/coach → { scores, keyMoment, coaching } */
export async function coachSession(
  sessionId: string,
  turns?: TranscriptTurnInput[]
): Promise<CoachResponse> {
  const res = await request(`/session/${sessionId}/coach`, {
    method: "POST",
    body: JSON.stringify(turns?.length ? { turns } : {}),
  });
  assertOk(res);
  return res.json() as Promise<CoachResponse>;
}

export async function endSessionAndCoach(
  sessionId: string,
  turns?: TranscriptTurnInput[]
): Promise<CoachResponse> {
  if (turns?.length) {
    try {
      await uploadTurns(sessionId, turns);
    } catch {
      // Coach endpoint also accepts turns as a fallback.
    }
  }
  try {
    await endSession(sessionId);
  } catch {
    // Still try coach — the session may already be marked ended.
  }
  return coachSession(sessionId, turns);
}
