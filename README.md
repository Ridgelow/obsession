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

**Custom LLM (dashboard — not an env var).** Cloudflared → server `:8787`. Set this URL on the agent:

`https://andale-controversy-oral-matches.trycloudflare.com/llm/chat/completions`

| Item | Value |
|------|--------|
| Agent name | Obsession First Date |
| `EXPO_PUBLIC_ELEVENLABS_AGENT_ID` | `agent_4801m2bbx00he4krmxrfdvyt4x2k` |
| `EXPO_PUBLIC_ELEVENLABS_API_KEY` | local `mobile/.env` only — never commit |
| Phone `EXPO_PUBLIC_API_URL` | `https://andale-controversy-oral-matches.trycloudflare.com` (no path) |

Dashboard steps: Agents → your agent → **Custom LLM** → URL above (OpenAI-compatible). Phase A already serves `POST /llm/chat/completions`. Do not rewrite the server brain.

LiveDate starts the agent with `dynamicVariables.session_id` and `customLlmExtraBody.sessionId`. If `EXPO_PUBLIC_ELEVENLABS_AGENT_ID` is empty, LiveDate still mounts; voice start is a no-op.

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
EXPO_PUBLIC_API_URL=https://andale-controversy-oral-matches.trycloudflare.com
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=agent_4801m2bbx00he4krmxrfdvyt4x2k
EXPO_PUBLIC_ELEVENLABS_API_KEY=
EXPO_PUBLIC_PRESAGE_API_KEY=
```

Do not commit `mobile/.env`.

## Stack

Persona · Gemini · ElevenLabs · Presage · Tiger Data · Backboard
