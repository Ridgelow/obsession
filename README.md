# Obsession

AI dating-conversation simulator/coach.  
**Stop practicing dates in your head.**

## Repo

| Path | What |
|------|------|
| [`mobile/`](mobile/) | Expo app |
| [`server/`](server/) | Express + Gemini custom LLM webhook |
| [`brand/`](brand/) | BRAND.md, tokens.css, app icon |
| [`mockups/`](mockups/) | Screen references |
| [`FRONTEND.md`](FRONTEND.md) | Frontend development plan |

## Quick start (server brain — Phase A)

```bash
cd server && npm i && cp .env.example .env   # fill keys; never commit .env
npm run dev                                  # :8787
```

Run `server/db/schema.sql` once on Tiger Cloud. Curl smoke tests:
[`server/README.md`](server/README.md).

## Phase B — Voice + camera HR (dev client, not Expo Go)

ElevenLabs and Presage need native modules. **Expo Go will not run this lane.**

```bash
cd mobile
cp .env.example .env          # fill keys locally — never commit .env
npm i
npx expo prebuild --clean
npx expo run:ios --device     # or: npx expo run:android --device
# EAS: eas build --profile development --platform ios
```

### ElevenLabs Agent (Hasnain)

| Item | Value |
|------|--------|
| Agent name | Obsession First Date |
| `EXPO_PUBLIC_ELEVENLABS_AGENT_ID` | `agent_4801m2bbx00he4krmxrfdvyt4x2k` |
| Custom LLM URL (dashboard) | `https://origin-governments-vancouver-commitment.trycloudflare.com/llm/chat/completions` |

Do **not** use `agent_6201m2bbxk6wesyvtmdymm2z9s0t`.

Create / confirm the agent in the ElevenLabs dashboard, set **Custom LLM** to that Cloudflare URL (OpenAI-compatible). LiveDate starts the agent with:

- `dynamicVariables.session_id`
- `customLlmExtraBody.sessionId` (SDK field → `custom_llm_extra_body` / `elevenlabs_extra_body`)

Phase A already resolves either field on `POST /llm/chat/completions`. Do not rewrite the server brain.

If `EXPO_PUBLIC_ELEVENLABS_AGENT_ID` is empty, LiveDate still mounts; voice start is a no-op.

### Presage / SmartSpectra (real camera)

| Item | Where |
|------|--------|
| `EXPO_PUBLIC_PRESAGE_API_KEY` | `mobile/.env` (device SDK) |
| `PRESAGE_API_KEY` | `server/.env` (optional cloud webhook — Garry) |

Get a key at [physiology.presagetech.com](https://physiology.presagetech.com). Physical device required (no camera HR in the iOS Simulator).

LiveDate prefers native SmartSpectra. `createVitalsSimulator()` is emergency fallback only (missing key, no native module, or start failure). Telemetry `source` is `"presage"` or `"simulator"`.

After prebuild, if iOS cannot import SmartSpectra: Xcode → **Add Package Dependencies…** → `https://github.com/Presage-Security/SmartSpectra-Swift` (3.0.0+). Android pulls `com.presagetech:smartspectra:3.3.0` via the config plugin.

### Mobile env (`mobile/.env` — do not commit)

```
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=agent_4801m2bbx00he4krmxrfdvyt4x2k
EXPO_PUBLIC_PRESAGE_API_KEY=
```

Physical phone talking to the tunneled server: set `EXPO_PUBLIC_API_URL` to `https://origin-governments-vancouver-commitment.trycloudflare.com` (no `/llm` path).

## Stack

Persona · Gemini · ElevenLabs · Presage · Tiger Data · Backboard
