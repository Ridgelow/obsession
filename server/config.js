// Shared knobs. Keep these in one place so telemetry + the Custom LLM
// webhook use the same NERVES threshold (the hero-moment trigger).

export const PORT = Number(process.env.PORT || 8787);

export const NERVES_THRESHOLD_BPM = Number(
  process.env.NERVES_THRESHOLD_BPM || 12
);

export const GEMINI_MODEL = "gemini-3.5-flash";

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function hasTigerUrl() {
  return Boolean(process.env.TIGER_DATA_URL);
}

export function hasBackboardKeys() {
  return Boolean(
    process.env.BACKBOARD_API_KEY && process.env.BACKBOARD_ASSISTANT_ID
  );
}
