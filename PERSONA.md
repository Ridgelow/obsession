# Persona (18+) — Teammate Dependency Guide

Use this if you are finishing **live Persona verification** on Obsession.  
Repo: https://github.com/Ridgelow/obsession · branch: **`main`**

Pull first:

```bash
git pull origin main
cd mobile
npm install --legacy-peer-deps
```

`--legacy-peer-deps` is needed because ElevenLabs peers an older LiveKit than we ship.

---

## What “done” looks like

1. User types a birthday on Sign Up (rejected client-side if under 18)
2. User taps **Verify You Are Human**
3. Real Persona Inquiry UI opens (camera / ID / selfie as template requires)
4. On success (`completed` / `approved` / `passed`), the app calls
   `POST /persona/verify-age { inquiryId, dateOfBirth }` on the server —
   Persona's mobile SDK never hands the extracted ID fields to the client,
   so this server call is what actually confirms the ID says 18+ **and**
   its birthdate matches what was typed
5. Only when that call returns `verified: true` → Continue unlocks
6. Verified state persists via AsyncStorage (`obsession.persona.verified`)
7. UI must **not** show the demo-mock label when live

Right now main ships with **mock on** so the rest of the demo works without a real `itmpl_` id. The mock inquiry has no real ID to check, so the server trusts the typed birthday for that one specific inquiry id (`inq_mock_unconfigured`) — see `server/persona.js`.

---

## NPM / Expo dependencies (already in the repo)

| Package | Role |
|--------|------|
| `react-native-persona` `^2.50.0` | Native Inquiry SDK |
| `expo` `~57` | App host |
| `expo-dev-client` | Required — **not Expo Go** |
| `expo-build-properties` | iOS 17+, Android Maven for Persona |
| `@react-native-async-storage/async-storage` | Persist verified |

Config plugins (already in `mobile/app.json`):

- `./plugins/withPersona.js` — Android Persona Maven + location/photo plist strings  
- `expo-build-properties` — includes Persona Maven: `https://sdk.withpersona.com/android/releases`

Docs:

- Persona RN: https://docs.withpersona.com/react-native-sdk-v2-integration-guide  
- Inquiry templates: Persona dashboard → **Templates** → copy id starting with **`itmpl_`**

---

## Critical: template ID format

| Value | Works? |
|-------|--------|
| `itmpl_…` | **Yes** — only format `Inquiry.fromTemplate` accepts |
| `persona_sandbox_2ccdba5e-…` (UUID style) | **No** — treated as placeholder → **mock path** |
| empty | **No** → mock |

Sandbox vs production env string is inferred: if the template id contains `sandbox` (case-insensitive) → `Environment.SANDBOX`, else `PRODUCTION`. Prefer a real sandbox `itmpl_` for HackRice.

---

## Env vars (`mobile/.env`)

`.env` is **gitignored**. Create/edit locally:

```bash
# REQUIRED for live Persona
EXPO_PUBLIC_PERSONA_TEMPLATE_ID=itmpl_YOUR_REAL_SANDBOX_TEMPLATE
EXPO_PUBLIC_PERSONA_USE_MOCK=0

# Other app keys (needed to run the rest of the demo — get from teammate / 1Password)
EXPO_PUBLIC_API_URL=https://YOUR-TUNNEL.trycloudflare.com
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=agent_…
EXPO_PUBLIC_ELEVENLABS_API_KEY=sk_…   # prefer server-side later; currently used in mobile .env
EXPO_PUBLIC_PRESAGE_API_KEY=…         # optional; HR falls back to simulator
```

Rules coded in `personaConfig.ts`:

- `EXPO_PUBLIC_PERSONA_USE_MOCK=1|true|yes` → **always mock**  
- Missing template or non-`itmpl_` → **mock**  
- Valid `itmpl_` + mock off → **live** native Inquiry

After changing `.env`, restart Metro (`npx expo start --clear`).

Server also needs `server/.env`:

```bash
# REQUIRED for /persona/verify-age to check a real ID (Persona Dashboard → Settings → API Keys)
PERSONA_API_KEY=persona_...
```

Without it, `/persona/verify-age` returns `{ verified: false, reason: "not_configured" }` for any real inquiry — only the mock inquiry id passes. The mobile app also needs `EXPO_PUBLIC_API_URL` pointing at this server (see `README.md` Phase A) — **Sign Up cannot complete, mock or not, if the server is unreachable.**

---

## Native build requirements (cannot use Expo Go)

Persona (and voice/LiveKit) need a **development build**.

```bash
cd mobile
npx expo prebuild   # generates ios/ android/ (ios is gitignored)
npx expo run:ios --device   # or Android equivalent
```

Permissions already declared:

| Platform | Permission | Why |
|----------|------------|-----|
| iOS | `NSCameraUsageDescription` | Face / ID |
| iOS | `NSLocationWhenInUseUsageDescription` | Persona inquiry |
| iOS | `NSPhotoLibraryUsageDescription` | ID upload |
| Android | `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | Same |

On device: allow Camera + Location when prompted.  
Settings → Obsession → confirm permissions if Inquiry fails silently.

**Apple:** physical device or simulator with camera workflow as Persona allows; HackRice demo should use a **real phone**.

---

## Code map (edit these)

| File | Purpose |
|------|---------|
| `mobile/src/services/personaConfig.ts` | Env helpers, mock vs live rules, verified status parsing — **safe / no native import** |
| `mobile/src/services/persona.native.ts` | Live SDK — **lazy `require("react-native-persona")`** so boot doesn’t crash |
| `mobile/src/services/persona.ts` | Web / tests stub |
| `mobile/src/screens/SignUpScreen.tsx` | Verify button UI + handlers — the only Persona entry point |
| `mobile/src/screens/OnboardingScreen.tsx` | Post-verification profile form (name/gender/goals/dates/partner history) — not Persona-related, just gates Home until answered |
| `mobile/src/services/profileStorage.ts` | AsyncStorage persist for the Onboarding profile answers |
| `mobile/src/services/verifiedStorage.ts` | AsyncStorage persist |
| `mobile/src/services/api.ts` | `verifyAgeWithPersona()` — calls the server cross-check after Persona's Inquiry completes |
| `mobile/plugins/withPersona.js` | Expo config plugin |
| `mobile/src/state/AppState.tsx` | `verified` / `setVerified` |
| `server/persona.js` | Fetches the completed Inquiry from Persona's API, extracts the ID's birthdate, checks match + 18+ |
| `server/routes/persona.js` | `POST /persona/verify-age` route |

Do **not** add a top-level `import … from "react-native-persona"` at app boot. That previously contributed to native-module crashes. Keep lazy load inside `startVerification` when not mocking.

Unlock statuses accepted today: `completed` | `approved` | `passed` (see `isVerifiedStatus`).

---

## Suggested work checklist

1. [ ] Persona dashboard: create/copy **sandbox 18+** template → `itmpl_…`, grab `PERSONA_API_KEY`
2. [ ] Set `EXPO_PUBLIC_PERSONA_TEMPLATE_ID` + `EXPO_PUBLIC_PERSONA_USE_MOCK=0` in `mobile/.env`
3. [ ] Set `PERSONA_API_KEY` in `server/.env`, run the server (`cd server && npm run dev`)
4. [ ] Dev client on phone (`expo run:ios --device` / Android)  
5. [ ] Enter a real 18+ birthday → Confirm birthday
6. [ ] Tap Verify You Are Human → real Inquiry → scan a real ID → server confirms match + 18+ → Continue unlocks
7. [ ] Kill app, reopen → still verified (storage)  
8. [ ] Confirm Sign Up **does not** show “Demo mock — not a real Persona inquiry…”  
9. [ ] Run tests: `cd mobile && npm run test:helpers` and `cd server && npm test`
10. [ ] Optional: decline / cancel paths show honest errors; don’t unlock Continue
11. [ ] Optional: type a birthday that doesn't match your real ID → server should reject with "doesn't match the birthday you entered"

---

## Known pitfalls

| Symptom | Likely cause |
|---------|----------------|
| Always mock / mock label on screen | Still `USE_MOCK=1` or template not `itmpl_` |
| “needs a prebuild / EAS dev client” | Running Expo Go or native module missing |
| App crash on launch after adding Persona imports | Top-level native import — use lazy require |
| Inquiry opens then fails permissions | Camera/Location denied in Settings |
| Template API errors | Wrong env (sandbox id with production) or bad `itmpl_` |
| "Couldn't confirm your ID" after a real scan | Server unreachable, or `PERSONA_API_KEY` unset (check `/health`'s `persona` field) |
| Checkbox never checks even on mock | Server (`server/`) isn't running / `EXPO_PUBLIC_API_URL` wrong — the mock path now round-trips through `/persona/verify-age` too |
| ID scan "completes" but extracted birthdate is always the same wrong date, no matter what real ID you scan | **Expected and confirmed in Sandbox.** Persona's Sandbox environment (labeled "Simulated Data" in the dashboard's Attributes panel) does not OCR the real document — every inquiry returns the same fixed fake identity: **`ALEXANDER J SAMPLE`, born `1977-07-17`**, ID number `I1234562`, address `600 California Street, San Francisco`. This is Persona's own test fixture, not something either app can change. To exercise the **match/pass** path deterministically, type `07/17/1977` as the Sign Up birthday — that's the one value that will match. Real OCR against a real ID only happens in Persona's **Production** environment (a separate account-level approval from Persona, not a config flag). |

---

## Out of scope for Persona (don’t block on these)

- ElevenLabs voice / LiveKit (already wired; still flaky audio on device)  
- Presage camera HR (intentionally **simulator** for now — SmartSpectra SPM crashed launch)  
- Server Custom LLM / Tiger / Backboard  

Focus Persona on **Sign Up → verified unlock**. Rest of the loop can keep using mock verify until you flip env.

---

## Quick smoke commands

```bash
cd server
npm install
npm test
npm run dev            # keep running — Sign Up needs this reachable

# other terminal:
cd mobile
npm install --legacy-peer-deps
npm run test:helpers
npx expo start --clear
# other terminal:
npx expo run:ios --device
```

Questions / keys: ask Hasnain for dashboard access and the shared `.env` values (never commit `.env`).
