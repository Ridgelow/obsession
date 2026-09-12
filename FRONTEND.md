# Obsession — Frontend development plan

HackRice sprint for `mobile/` (Expo). Pixel the four mockups first; wire APIs after.

## Run

```bash
cd mobile
npm start
```

Then open iOS Simulator, Android emulator, or Expo Go for UI-only work.

**Phase B (voice + camera HR) is not Expo Go.** Use a prebuild / EAS dev client:

```bash
npx expo prebuild --clean
npx expo run:ios --device
```

ElevenLabs: `EXPO_PUBLIC_ELEVENLABS_AGENT_ID` (waiting on Hasnain).  
Custom LLM (dashboard): `https://frequency-remains-solely-univ.trycloudflare.com/llm/chat/completions`  
API key env name only: `EXPO_PUBLIC_ELEVENLABS_API_KEY` (local `.env`, never commit).  
Presage: `EXPO_PUBLIC_PRESAGE_API_KEY` in `mobile/.env`. Simulator vitals are fallback only.

## Sprint order

### FE-1 — Shell (done)
- Expo + Bodoni Moda / Manrope
- Theme tokens from `brand/tokens.css`
- Nav: Onboarding → Main tabs → LiveDate → Results
- Shared UI: Wordmark, ObCard, ObButton, Eyebrow, NerveTag, AiBubble

### FE-2 — Screens with mock data (done / polish next)
| Screen | Status | Owner later |
|--------|--------|-------------|
| Onboarding + Persona UI | Mock verify | Persona teammate |
| Home (Practice) | Mock memory + scenarios | Core B |
| Live Date | Vitals simulator → NERVES↑ | Core A + B |
| Results | Mock scores + timeline | Core B |
| History / Profile | Stubs | Core B |

**Polish checklist**
- [ ] Match mockup spacing/type sizes against `mockups/*.png`
- [ ] Silhouette art / low-light photo instead of plain shape
- [ ] Haptic on NERVES↑ (`expo-haptics`)
- [ ] Persist `verified` with AsyncStorage

### FE-3 — Wire real services (after FE-2 looks right)
| Wire | File | Depends on |
|------|------|------------|
| Persona | `src/services/persona.ts` | Dev client + template ID |
| Session create | `src/services/api.ts` | Express server up |
| ElevenLabs | `src/services/elevenlabs.ts` + `.native.ts` | Agent id env + Custom LLM URL (Hasnain) |
| Presage camera | `src/services/presage.ts` + `modules/smart-spectra` | Real HR; simulator only if native/key fails |
| Results fetch | `api.ts` coaching/timeline | Tiger data from a real session |

### FE-4 — Demo hardening
- Scripted path: verify → First Date → wait for spike → End → Results
- Good lighting for camera; mute notifications
- Fallback: keep vitals simulator if Presage flaky on stage

## Folder map

```
mobile/
  App.tsx
  src/
    theme/tokens.ts
    components/
    screens/
    navigation/
    state/AppState.tsx
    services/          # starter stubs — wire in FE-3
brand/                 # BRAND.md, tokens.css, app-icon.png
mockups/               # reference PNGs
server/                # Express starter (Lead)
```

## Conventions
- Colors/type only from `src/theme/tokens.ts`
- Hit targets ≥ 44pt
- Coaching copy never claims definite emotions
- Accent (`pulse`/`hush`) rare — chips, hairlines, play orb, score fills
