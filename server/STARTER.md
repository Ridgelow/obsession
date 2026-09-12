# Obsession — implementation starter

Everything here is scaffold, not a finished build — API keys, an actual pg
connection, and device testing are still yours to do. It's organized so you
can hand each piece to a different person and have them not collide.

## Architecture in one paragraph

The ElevenLabs Agent owns the voice UX (turn-taking, STT, TTS) but is
configured to call **your** server as a "custom LLM" instead of its default
model — that's `server/routes/llmWebhook.js`, an OpenAI-compatible endpoint
that actually asks Gemini for the date's next line. On every turn, that
webhook reads the latest heart-rate row out of Tiger Data, computes the
deviation from this session's baseline, and folds it into Gemini's prompt as
a `[SIGNAL: ...]` note — that's the "AI reacts to your physiology live" demo
moment. Presage feeds Tiger Data; Backboard reads/writes a one-sentence
memory of patterns across sessions, at the start and end of each one.

## Build order (matches the earlier 10-hour plan — same order, now pointing at real files)

1. **Scaffold** — `server/` runs standalone (`npm i && npm run dev` after
   copying `.env.example` to `.env`); the mobile app's four screens from the
   brand canvas become real `mobile/screens/*` wired to React Navigation.
2. **Gemini** — `server/gemini.js`. Get `nextDateLine()` returning sensible
   text with a fake `history` array before anything else touches it.
3. **ElevenLabs** — `mobile/services/elevenlabs.ts` + configure the Agent's
   Custom LLM URL (via ngrok/similar while local) to point at
   `POST /llm/chat/completions`. You'll have voice talking to Gemini before
   physiology is wired in at all — that's fine, it's a legitimate demo state.
4. **Presage → Tiger Data** — `mobile/services/presage.ts` writes readings via
   `sendTelemetry()` in `mobile/services/api.ts`, which lands in
   `server/routes/telemetry.js` → the `telemetry` hypertable
   (`server/db/schema.sql`). Presage's mobile SDK is native-only (no RN
   wrapper) — read the warning at the top of `presage.ts` and decide
   native-module vs. cloud-REST early, it changes your time budget a lot.
5. **The reactive loop** — once telemetry rows exist, `llmWebhook.js` already
   reads them and injects the `[SIGNAL: ...]` note; this step is mostly
   rehearsing the threshold (`NERVES_THRESHOLD_BPM` in `telemetry.js`) against
   a real face and a real anxious question until it fires at the right
   moment, not new code.
6. **Persona** — `mobile/services/persona.ts`, called once on the Onboarding
   screen before "Continue" unlocks. Fully independent of everything else —
   good task to hand to whoever finishes their piece first.
7. **Backboard** — `server/backboard.js`, called in `session.js` (start) and
   `coaching.js` (end). Needs at least one completed session before the
   recall call returns anything interesting, so test it with two sessions
   back-to-back near the end, not in isolation.
8. **Results screen** — `server/routes/coaching.js` → the scores + timeline
   the Results screen renders; `telemetry.js`'s `GET /timeline` feeds the
   timeline dots.

## What's deliberately not here

Auth beyond Persona's own inquiry flow, retry/error UI for flaky network
conditions, and the native Presage bridge itself (code sketch only) — all
reasonable to skip for a 10-hour build, all worth naming explicitly in your
pitch as "cut for time" rather than pretending they're done.
