# Obsession — Testing Requirements

HackRice demo / phone dry-run checklist. **Do not use Expo Go** for voice or camera.

Live Custom LLM / API tunnel URL changes when the tunnel restarts — use whatever garry last posted in the **garry and SWE** group chat. Do not trust stale URLs in README.

---

## 0. What “done enough to test” means

You can walk this path on a **physical phone**:

1. Onboarding verify (Persona 18+ sandbox, or labeled mock if Persona PR not merged yet)
2. Home → Begin First Date
3. LiveDate: **mic** (ElevenLabs) + **camera HR** (Presage) + NERVES↑ when HR jumps
4. AI voice adapts after a spike (Custom LLM → Gemini)
5. End → Results scores + timeline + coach note
6. Second session Home card shows Backboard memory (needs Backboard credits)

---

## 1. Hardware / accounts

| Need | Notes |
|------|--------|
| Physical iPhone or Android | Camera HR does not work in iOS Simulator |
| Mac with Xcode (iOS) or Android Studio | Dev client build |
| ElevenLabs account | Agent `agent_4801m2bbx00he4krmxrfdvyt4x2k` |
| Presage / SmartSpectra key | physiology.presagetech.com |
| Persona sandbox template | `persona_sandbox_2ccdba5e-08cd-4e47-965f-a59133988bb0` (18+) |
| Tiger + Gemini + Backboard | Already on server `.env` |

---

## 2. Server (garry keeps this up)

```bash
# usually already running in screen session `obsession`
cd server && npm i && node index.js   # :8787
curl -sS http://127.0.0.1:8787/health
# expect: ok, db=tiger, gemini=true, backboard=true
```

Optional smoke:

```bash
cd server && npm run smoke
```

Tunnel (screen `obsession-tunnel`) must reach the same process. Custom LLM path:

`https://<current-tunnel>/llm/chat/completions`

Phone `EXPO_PUBLIC_API_URL` = `https://<current-tunnel>` (**no** `/llm/...` path).

---

## 3. Mobile env (`mobile/.env` — never commit)

```
EXPO_PUBLIC_API_URL=https://<current-tunnel-from-group-chat>
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=agent_4801m2bbx00he4krmxrfdvyt4x2k
EXPO_PUBLIC_ELEVENLABS_API_KEY=<sk_...>
EXPO_PUBLIC_PRESAGE_API_KEY=<presage>
EXPO_PUBLIC_PERSONA_TEMPLATE_ID=persona_sandbox_2ccdba5e-08cd-4e47-965f-a59133988bb0
```

Confirm Agent dashboard Custom LLM URL matches the **latest** group-chat tunnel.

---

## 4. Build the dev client (required)

```bash
cd mobile
npm i
npx expo prebuild --clean
npx expo run:ios --device
# or: npx expo run:android --device
```

If iOS can’t import SmartSpectra after prebuild: Xcode → Add Package → `https://github.com/Presage-Security/SmartSpectra-Swift` (3.0.0+).

Grant **Camera** + **Microphone** when prompted.

---

## 5. Functional test cases

### T1 — Health / API reachability
- [ ] Mac: `curl localhost:8787/health` → 200
- [ ] Phone on same network / tunnel: app can `POST /session/start`

### T2 — Onboarding (Persona)
- [ ] Verify unlocks Continue only when inquiry completes (18+ template)
- [ ] Cancel / error paths don’t unlock Continue
- [ ] If Persona PR not merged: mock verify is clearly labeled

### T3 — Home
- [ ] Scenario chips: First Date / Coffee Chat / Silence
- [ ] “From your last session” shows Backboard `priorPatterns` after a prior coach (or empty/billing note)

### T4 — LiveDate voice (ElevenLabs)
- [ ] Mic permission granted
- [ ] Agent greets / responds with spoken audio
- [ ] User speech produces AI turns (not stuck disconnected)
- [ ] AiBubble shows latest AI line when timeline has turns

### T5 — LiveDate vitals (Presage)
- [ ] Camera permission granted
- [ ] HR readings appear (not stuck null forever)
- [ ] Telemetry `source` is `presage` when camera path works
- [ ] Simulator fallback only if native fails — UI hint if so

### T6 — Hero moment (must pass for demo)
- [ ] After ~20s baseline, raise HR (stress / movement / warm-up)
- [ ] NERVES↑ chip when `\|delta\| ≥ 12`
- [ ] Next AI line lightly acknowledges spike (no “I know you’re scared”)
- [ ] Timeline flags that moment on Results

### T7 — Results / coach
- [ ] End → scores (chemistry, conversation, composure, curiosity)
- [ ] keyMoment + coaching text present
- [ ] Timeline lists turns with optional `flagged`

### T8 — Memory (session 2)
- [ ] Start another date → Home memory card updates from Backboard
- [ ] If Backboard billing blocks LLM: fix credits, don’t treat as app bug

### T9 — Failure modes
- [ ] Kill tunnel → clear error / reconnect guidance (no silent hang)
- [ ] Missing Agent ID → LiveDate still opens; voice is no-op
- [ ] Deny camera → simulator fallback or explicit hint

---

## 6. Demo timing (2:00 live)

| Time | Beat |
|------|------|
| 0:00 | Hook: words + heart rate |
| 0:15 | Home memory → Begin |
| 0:25 | Talk → NERVES↑ → AI acknowledges |
| 1:40 | Results |
| 1:55 | Six sponsors |
| 2:00 | Q&A |

Sponsors to name: Persona, Gemini, ElevenLabs, Presage, Tiger Data, Backboard.

---

## 7. Ownership during test

| Who | Owns |
|-----|------|
| **Hasnain** | Phone, permissions, Persona verify, speaking the demo script |
| **garry** | Server `:8787`, tunnel, Custom LLM URL, Gemini/Tiger/Backboard |
| **SWE** | Dev client build help, Persona wiring PR, LiveDate voice/Presage bugs |

---

## 8. Pass / fail for “ready to show judges”

**Pass** if T4 + T5 + T6 + T7 succeed on one device in under 2 minutes without restarting mid-demo.

**Fail** if Expo Go is required, HR never leaves simulator without a visible hint, or AI never speaks.
