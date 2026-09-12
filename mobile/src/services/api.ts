// Client for server/ (Gemini + Tiger Data + Backboard). Keys stay on the server.

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export async function startSession(userId: string, scenario = "first_date") {
  const res = await fetch(`${BASE_URL}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, scenario }),
  });
  return res.json() as Promise<{ sessionId: string; priorPatterns: string | null }>;
}

export async function setBaseline(sessionId: string, heartRate: number) {
  await fetch(`${BASE_URL}/session/${sessionId}/baseline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ heartRate }),
  });
}

export async function sendTelemetry(
  sessionId: string,
  reading: { heartRate: number; breathingRate?: number; engagement?: number }
) {
  const res = await fetch(`${BASE_URL}/session/${sessionId}/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reading),
  });
  return res.json() as Promise<{ delta: number; flagged: boolean }>;
}

export async function getTimeline(sessionId: string) {
  const res = await fetch(`${BASE_URL}/session/${sessionId}/timeline`);
  return res.json();
}

export async function endSessionAndCoach(sessionId: string) {
  await fetch(`${BASE_URL}/session/${sessionId}/end`, { method: "POST" });
  const res = await fetch(`${BASE_URL}/session/${sessionId}/coach`, {
    method: "POST",
  });
  return res.json() as Promise<{
    scores: {
      chemistry: number;
      conversation: number;
      composure: number;
      curiosity: number;
    };
    keyMoment: string;
    coaching: string;
  }>;
}
