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

1. User taps **Verify** on Onboarding  
2. Real Persona Inquiry UI opens (camera / ID / selfie as template requires)  
3. On success (`completed` / `approved` / `passed`) → Continue unlocks  
4. Verified state persists via AsyncStorage (`obsession.persona.verified`)  
5. UI must **not** show the demo-mock label when live

Right now main ships with **mock on** so the rest of the demo works without a real `itmpl_` id.

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
| `mobile/src/screens/OnboardingScreen.tsx` | Verify button UI + handlers |
| `mobile/src/services/verifiedStorage.ts` | AsyncStorage persist |
| `mobile/plugins/withPersona.js` | Expo config plugin |
| `mobile/src/state/AppState.tsx` | `verified` / `setVerified` |

Do **not** add a top-level `import … from "react-native-persona"` at app boot. That previously contributed to native-module crashes. Keep lazy load inside `startVerification` when not mocking.

Unlock statuses accepted today: `completed` | `approved` | `passed` (see `isVerifiedStatus`).

---

## Suggested work checklist

1. [ ] Persona dashboard: create/copy **sandbox 18+** template → `itmpl_…`  
2. [ ] Set `EXPO_PUBLIC_PERSONA_TEMPLATE_ID` + `EXPO_PUBLIC_PERSONA_USE_MOCK=0`  
3. [ ] Dev client on phone (`expo run:ios --device` / Android)  
4. [ ] Tap Verify → real Inquiry → approved → Continue  
5. [ ] Kill app, reopen → still verified (storage)  
6. [ ] Confirm Onboarding **does not** show “Demo mock — not a real Persona inquiry…”  
7. [ ] Run tests: `cd mobile && npm run test:helpers` (includes `persona.test.ts`)  
8. [ ] Optional: decline / cancel paths show honest errors; don’t unlock Continue  

---

## Known pitfalls

| Symptom | Likely cause |
|---------|----------------|
| Always mock / mock label on screen | Still `USE_MOCK=1` or template not `itmpl_` |
| “needs a prebuild / EAS dev client” | Running Expo Go or native module missing |
| App crash on launch after adding Persona imports | Top-level native import — use lazy require |
| Inquiry opens then fails permissions | Camera/Location denied in Settings |
| Template API errors | Wrong env (sandbox id with production) or bad `itmpl_` |

---

## Out of scope for Persona (don’t block on these)

- ElevenLabs voice / LiveKit (already wired; still flaky audio on device)  
- Presage camera HR (intentionally **simulator** for now — SmartSpectra SPM crashed launch)  
- Server Custom LLM / Tiger / Backboard  

Focus Persona on **Onboarding → verified unlock**. Rest of the loop can keep using mock verify until you flip env.

---

## Quick smoke commands

```bash
cd mobile
npm install --legacy-peer-deps
npm run test:helpers
npx expo start --clear
# other terminal:
npx expo run:ios --device
```

Questions / keys: ask Hasnain for dashboard access and the shared `.env` values (never commit `.env`).
