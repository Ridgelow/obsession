# OBSESSION — Full Implementation Plan (AI Handoff)

**Give this entire file to Grok (or any coding agent).** It is the single source of truth for finishing the HackRice project. Do not invent a different architecture.

---

## 0. What Obsession is

**Obsession** is a mobile AI **dating-conversation simulator/coach** — not a chatbot girlfriend.

**Tagline:** *Stop practicing dates in your head.*

**Core loop (must all fire in one demo session):**

1. Persona verifies the user is human  
2. User starts a short practice date (voice)  
3. Presage (or simulator) streams heart rate  
4. Telemetry lands in Tiger Data  
5. ElevenLabs Agent handles voice turns; each AI turn hits **our** Custom LLM webhook  
6. Webhook reads HR vs baseline from Tiger; if delta ≥ ~12 bpm, injects `[SIGNAL: …]` into Gemini  
7. Gemini writes an adaptive date line (e.g. “Oh, I definitely hit a nerve there.”)  
8. Client shows **NERVES ↑** chip  
9. Session ends → scores (Chemistry, Conversation, Composure, Curiosity) + timeline + coach’s note  
10. Backboard stores a one-sentence pattern for the next Home card  

**Pitch line for judges:**  
“Unlike a chatbot, Obsession adapts the simulation based on both what you say and how your physiological signals change — then coaches the moment, without claiming it knows your emotions.”

**Event:** HackRice 16  
- Devpost video due **Sun 9/13 9:00 AM** (3–4 min, mandatory)  
- Live judging **Sun 9:30 AM–12 PM**: **2 min demo + 1 min Q&A**

---

## 1. Current repo state (DO NOT re-scaffold from scratch)

GitHub: `https://github.com/Ridgelow/obsession`  
Local: `/Users/hasnainrizvi/obsession`

```
obsession/
  mobile/          # Expo SDK 57 TypeScript app — UI SCREENS ARE DONE (mock data)
  server/          # Express starter — routes sketched, needs keys + wiring
  brand/           # BRAND.md, tokens.css, app-icon.png
  mockups/         # onboarding-home.png, live-results.png
  FRONTEND.md      # frontend sprint notes
  FULL_PLAN.md     # THIS FILE
  README.md
```

### Already done (frontend)
- Expo app with Bodoni Moda + Manrope  
- Theme: `mobile/src/theme/tokens.ts`  
- Components: Wordmark, ObCard, ObButton, Eyebrow, NerveTag, AiBubble  
- Screens: Onboarding, Home, LiveDate (vitals **simulator**), Results, History stub, Profile stub  
- Nav: Onboarding → Main tabs (Practice/History/Profile) → LiveDate → Results  
- Service **stubs**: `persona.ts`, `elevenlabs.ts`, `presage.ts`, `api.ts` (typed, not fully wired to UI)

### Not done (functionality — cook these)
- Boot Express with real env keys  
- Wire Tiger Data schema + connection  
- Gemini live in `nextDateLine` / `coachSession`  
- ElevenLabs Agent + Custom LLM → webhook  
- LiveDate posts telemetry + starts voice session  
- Results fetches coaching/timeline from API  
- Real Persona SDK  
- Optional Presage native; **keep simulator as fallback**  
- Backboard recall/write end-to-end  
- Demo script + Devpost video assets  

---

## 2. Architecture (LOCKED — do not replace with Cloudflare Workers / WebSockets)

```
Mobile (Expo)
  ├─ Persona SDK          → unlock Continue
  ├─ ElevenLabs Agent     → STT/TTS/turn-taking
  ├─ Presage or Simulator → HR ticks
  └─ api.ts               → REST to Express

Express (server/, PORT 8787)
  ├─ POST /session/start
  ├─ POST /session/:id/baseline
  ├─ POST /session/:id/telemetry
  ├─ GET  /session/:id/timeline
  ├─ POST /session/:id/end
  ├─ POST /session/:id/coach
  └─ POST /llm/chat/completions   ← ElevenLabs Custom LLM (OpenAI-compatible SSE)

Gemini          ← date lines + coaching JSON
Tiger Data      ← hypertables: telemetry, conversation_turns, sessions
Backboard       ← cross-session one-sentence memory
```

**Key insight:** ElevenLabs owns voice UX. Our server is the “brain” only on each AI turn via Custom LLM webhook. Physiology is **not** in the audio path — it is read from Tiger at webhook time.

---

## 3. Brand tokens (LOCKED)

| Token | Hex | Use |
|-------|-----|-----|
| void | `#0e0707` | background |
| ink | `#040202` | cards |
| bone | `#f5f1ec` | text + primary CTAs |
| muted | `#a39d98` | secondary text |
| line | `#2e2726` | borders |
| pulse | `#d74745` | NERVES, End, play orb |
| hush | `#c24ba1` | glows, accents |

Fonts: **Bodoni Moda** (display/italic AI lines), **Manrope** (UI).  
Radii: sm 6, md **12**, pill 999.  
Rules: accents rare; coaching never claims definite emotions; warm black not pure `#000`.

---

## 4. Screen contracts (UI exists — wire data)

### Onboarding
- Mock verify → replace with `startVerification()` from `mobile/src/services/persona.ts`  
- Continue enabled only when verified  
- Persist verified (AsyncStorage)

### Home
- Show `priorPatterns` from `POST /session/start` or last coach memory on “From your last session”  
- Begin → create session → navigate LiveDate with `sessionId`  
- Scenarios: First Date | Coffee Chat | Silence (map to server `scenario` string)

### Live Date
- On mount: `startSession`, set baseline after ~15–20s of HR, start ElevenLabs with `sessionId`  
- Every ~1s: vitals (simulator or Presage) → `sendTelemetry(sessionId, reading)`  
- When API returns `flagged: true` OR local delta ≥ 12: show NerveTag  
- Show latest AI line in AiBubble (from conversation status or local state)  
- End → `endSessionAndCoach` → navigate Results with payload  

### Results
- Render `scores`, `keyMoment`, `coaching` from coach API  
- Timeline from `getTimeline(sessionId)`  
- Practice again → new LiveDate  

---

## 5. Server file map (implement / finish these)

| File | Job |
|------|-----|
| `server/index.js` | Express mount (done) |
| `server/.env` | Copy from `.env.example`, fill keys |
| `server/db.js` | Postgres pool via `TIGER_DATA_URL` |
| `server/db/schema.sql` | Run once on Tiger Cloud |
| `server/gemini.js` | `nextDateLine`, `coachSession` (mostly done) |
| `server/backboard.js` | recall + save patterns |
| `server/routes/session.js` | start / baseline / end |
| `server/routes/telemetry.js` | insert vitals; compute delta vs baseline; `NERVES_THRESHOLD_BPM ≈ 12` |
| `server/routes/llmWebhook.js` | Custom LLM SSE; read latest HR; call Gemini; log AI turn |
| `server/routes/coaching.js` | build transcript+signals; Gemini coach JSON; save Backboard; save scores on session |

### Env vars (`server/.env`)
```
GEMINI_API_KEY=
TIGER_DATA_URL=postgres://...
BACKBOARD_API_KEY=
BACKBOARD_ASSISTANT_ID=
PRESAGE_API_KEY=          # optional
PERSONA_API_KEY=          # optional webhook
PORT=8787
```

### Mobile env (`mobile/.env` or app config)
```
EXPO_PUBLIC_API_URL=https://YOUR_NGROK.ngrok.app
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=
EXPO_PUBLIC_PERSONA_TEMPLATE_ID=
```

**Local demo:** run `ngrok http 8787` and set ElevenLabs Agent Custom LLM URL to  
`https://…/llm/chat/completions`

---

## 6. API contracts (exact shapes)

### `POST /session/start`
Body: `{ "userId": "demo-user", "scenario": "first_date" }`  
Resp: `{ "sessionId": "uuid", "priorPatterns": "string|null" }`

### `POST /session/:id/baseline`
Body: `{ "heartRate": 71 }` → 204

### `POST /session/:id/telemetry`
Body: `{ "heartRate": 89, "breathingRate": 14, "engagement": 0.6 }`  
Resp: `{ "delta": 18, "flagged": true }`

### `POST /llm/chat/completions` (ElevenLabs Custom LLM)
- Accept OpenAI-style `{ messages, elevenlabs_extra_body?, dynamic_variables? }`  
- Resolve `sessionId` from `elevenlabs_extra_body.sessionId` OR `dynamic_variables.session_id`  
- Map messages → history  
- Query latest telemetry + session.hr_baseline  
- If `|delta| >= 12`, `latestSignal = "heart rate jumped Nbpm on this question"`  
- `text = await nextDateLine({ history, latestSignal, priorPatterns })`  
- Insert conversation_turns speaker=`ai`, flagged if signal  
- Respond **SSE**:
```
data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

### `POST /session/:id/coach`
Resp:
```json
{
  "scores": { "chemistry": 72, "conversation": 65, "composure": 54, "curiosity": 80 },
  "keyMoment": "0:42 — asked about your last relationship",
  "coaching": "You recovered well after the pause — but the answer trailed off..."
}
```

### `GET /session/:id/timeline`
Array of turns with `time`, `speaker`, `text`, `hr_delta`, `flagged`

---

## 7. Gemini behavior (LOCKED copy rules)

**Date persona:** warm, slightly guarded first date; 1–3 spoken sentences.  
When `[SIGNAL: …]` appears: notice lightly, adapt — **never** “I know you’re scared.” Prefer “you seem a little thrown.”

**Coaching:** JSON only; coach **delivery and answer craft** for the spiked moment; no emotion certainty claims.

Model: `gemini-3.6-flash` (already in `gemini.js`).

Scenarios = different system prompts (First Date / Coffee Chat / Silence).

---

## 8. Mobile wiring checklist (replace mocks)

### `mobile/src/services/api.ts`
- `EXPO_PUBLIC_API_URL` default currently `localhost:3000` — **change to `http://localhost:8787` or ngrok**  
- Paths already match server (`/session/start`, etc.)

### `LiveDateScreen.tsx`
1. Call `startSession` on mount; store `sessionId`  
2. Replace local timer HR with `createVitalsSimulator()` → `sendTelemetry`  
3. After ~20s average HR → `setBaseline`  
4. Call `useDateConversation(sessionId).start()` when ElevenLabs SDK installed  
5. On End: `endSessionAndCoach` → pass results to Results via route params or context  

### `OnboardingScreen.tsx`
- Call real `startVerification({ onVerified, onCanceled, onError })`  
- Install `react-native-persona` + Expo config plugin + **dev client** (not Expo Go for production Persona)

### `elevenlabs.ts`
- Install `@elevenlabs/react-native` + LiveKit deps per ElevenLabs Expo guide  
- `startSession({ agentId, dynamicVariables: { session_id } })`  
- Confirm which prop passes `elevenlabs_extra_body: { sessionId }` for your SDK version  

### `presage.ts`
- Prefer **simulator** for demo reliability  
- Native SmartSpectra only if time (Swift/Kotlin bridge)  

---

## 9. Team parallelization (4 people)

| Role | Owns | Files | Done when |
|------|------|-------|-----------|
| **Lead** | Server brain | `server/**`, ngrok, Gemini, Tiger, Backboard, llmWebhook | Curl webhook returns adaptive line when fake HR spiked in DB |
| **Core A** | Voice | `elevenlabs.ts`, LiveDate audio UX, Agent dashboard | Spoken date replies via Custom LLM |
| **Core B** | UI polish + vitals → API + Results data | screens, `presage.ts`, telemetry posts | NERVES chip + Results from API |
| **Persona** | Identity only | `persona.ts`, Onboarding | Real inquiry unlocks Continue |

**Rule:** Nobody blocks on Presage. Nobody invents new event names. Persona does not touch Gemini/ElevenLabs/Tiger.

---

## 10. Build order (execute in this sequence)

### Phase A — Server brain (Lead) — FIRST
1. `cd server && npm i && cp .env.example .env` fill keys  
2. Run `schema.sql` on Tiger Cloud  
3. `npm run dev` → listening `:8787`  
4. Unit-test `nextDateLine` with fake history (no ElevenLabs yet)  
5. Insert fake telemetry row; hit `POST /llm/chat/completions` with messages + sessionId; confirm SIGNAL path  
6. Expose with ngrok  

### Phase B — Voice (Core A) — parallel after webhook exists
1. Create ElevenLabs Agent; Custom LLM URL = ngrok `/llm/chat/completions`  
2. Install RN SDK; wire LiveDate start/stop  
3. Confirm spoken Gemini lines  

### Phase C — Physiology (Core B) — parallel
1. LiveDate posts simulator HR every second  
2. Baseline after 20s  
3. Threshold flags NERVES UI  
4. Rehearse “ex question” until spike is reliable  

### Phase D — Coaching + memory
1. Wire End → coach API → Results screen  
2. Backboard save on coach; recall on next start → Home card  

### Phase E — Persona
1. Real SDK on Onboarding  
2. Theme inquiry if dashboard allows  

### Phase F — Demo lock
1. One phone, one path, 3 dry runs timed to 2:00  
2. Record Devpost video (outline below)  
3. README for judges: which sponsor each beat hits  

---

## 11. Acceptance criteria (definition of done)

- [ ] Verify (Persona or honest mock labeled) → Home  
- [ ] Begin date → hear AI voice (ElevenLabs)  
- [ ] HR rises (sim or Presage) → NERVES↑ chip  
- [ ] AI verbally acknowledges the spike (Gemini via webhook)  
- [ ] End → scores + timeline moment + coach note  
- [ ] Second session Home card shows Backboard memory  
- [ ] All six sponsors nameable in 10 seconds: Persona, Gemini, ElevenLabs, Presage, Tiger Data, Backboard  
- [ ] Devpost video uploaded before 9:00 AM Sun  
- [ ] Live cue cards ready (2:00 demo)  

---

## 12. Demo scripts

### Live 2:00
```
[0:00] Hook: practice hard convos; adapts to words + heart rate
[0:15] Home: Backboard memory → Begin First Date
[0:25] Talk → vitals climb → NERVES↑ → "hit a nerve"
[1:40] Results: scores → timeline → coach note
[1:55] "Six APIs. One loop."
[2:00] Q&A
```

### Devpost video 3:30
- 0:00–0:30 Intro + logo strip + track  
- 0:30–2:30 Demo (same path)  
- 2:30–3:00 Architecture one diagram  
- 3:00–3:30 Impact + future  

### Q&A bank
- vs ChatGPT? No physio loop / timeline coaching  
- Detect emotions? No — deviation + delivery coaching  
- Hardest? Custom LLM + live telemetry sync  
- Scale? New scenario prompts + Backboard  

---

## 13. Explicit non-goals (cut for time if needed)
- Full auth system beyond Persona  
- Perfect Presage native bridge (simulator OK for demo)  
- Polished History list  
- Production hardening / retries  
- Claiming emotion detection  

---

## 14. Commands cheat sheet

```bash
# Mobile UI
cd mobile && npm start
# iOS: press i  |  API URL must reach server

# Server
cd server && npm i && npm run dev
# http://localhost:8787

# Tunnel for ElevenLabs
ngrok http 8787
```

---

## 15. Instructions for Grok / coding agents

1. **Read this file fully before coding.**  
2. **Extend existing files** in `mobile/` and `server/` — do not create a new monorepo or switch to Cloudflare Workers.  
3. Prefer **simulator vitals** over blocking on Presage.  
4. Keep coaching/date copy **humble** (no emotion certainty).  
5. After each phase, verify with curl + one device path.  
6. Wire UI to APIs; remove hardcoded Results scores once coach API works.  
7. If an SDK needs a **dev client**, document `npx expo prebuild` / EAS steps; don’t assume Expo Go for Persona/ElevenLabs native modules.  
8. Commit logically: server brain → voice → telemetry UI → coaching → persona.  

**Hero moment to protect at all costs:**  
Heart rate jump → NERVES↑ → Gemini date says it hit a nerve → timeline shows that moment on Results.

---

*End of handoff. Cook.*
