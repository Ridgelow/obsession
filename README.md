# Obsession

AI dating-conversation simulator/coach.  
**Stop practicing dates in your head.**

## Repo

| Path | What |
|------|------|
| [`mobile/`](mobile/) | Expo app (frontend sprint) |
| [`server/`](server/) | Express + Gemini custom LLM webhook |
| [`brand/`](brand/) | BRAND.md, tokens.css, app icon |
| [`mockups/`](mockups/) | Screen references |
| [`FRONTEND.md`](FRONTEND.md) | Frontend development plan |

## Quick start (UI)

```bash
cd mobile && npm start
```

## Quick start (server brain — Phase A)

```bash
cd server && npm i && cp .env.example .env   # fill keys; never commit .env
npm run dev                                  # :8787
```

Run `server/db/schema.sql` once on Tiger Cloud. Curl smoke tests:
[`server/README.md`](server/README.md).

## Stack

Persona · Gemini · ElevenLabs · Presage · Tiger Data · Backboard
