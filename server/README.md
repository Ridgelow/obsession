# Obsession server — Phase A (brain)

Express on **:8787**. ElevenLabs owns voice; this process is the brain on each
AI turn via the Custom LLM webhook, plus session / telemetry / coaching REST.

```
Mobile  →  POST /session/*  +  telemetry
ElevenLabs Agent  →  POST /llm/chat/completions  →  Gemini + Tiger HR
```

## Setup

```bash
cd server
npm i
cp .env.example .env   # fill keys locally — never commit .env
```

Keys to put in `server/.env` (see `.env.example`):

| Variable | Required for | Notes |
|---|---|---|
| `GEMINI_API_KEY` | live date lines + coaching | model `gemini-3.6-flash` |
| `TIGER_DATA_URL` | durable sessions / hypertables | run `db/schema.sql` once on Tiger Cloud |
| `BACKBOARD_API_KEY` | Home “from last session” | optional; start/coach degrade if missing |
| `BACKBOARD_ASSISTANT_ID` | same | assistant-scoped memory |
| `PORT` | listen | default `8787` |
| `NERVES_THRESHOLD_BPM` | NERVES↑ | default `12` |

Missing keys do **not** crash the process. The server logs a warning and:

- no `TIGER_DATA_URL` → in-memory store (smoke-testable, not durable)
- no `GEMINI_API_KEY` → locked fallback copy (SIGNAL still changes the line)
- no Backboard keys → `priorPatterns` is `null`; coach still returns scores

```bash
npm run dev          # node --watch
# http://localhost:8787/health
```

Tiger Cloud (once): paste `db/schema.sql` into the SQL editor, then set
`TIGER_DATA_URL`. Local demo tunnel for ElevenLabs:

```bash
ngrok http 8787
# Agent Custom LLM URL must be exactly:
#   https://<public-host>/llm/chat/completions
# Current demo tunnel (Hasnain's Obsession First Date agent):
#   https://andale-controversy-oral-matches.trycloudflare.com/llm/chat/completions
```

## Phase A curl smoke tests

These prove the hero path: **HR jump → webhook SIGNAL → adaptive line → coach JSON**.

Start the server (`npm run dev`), then:

```bash
# 0. health
curl -s http://localhost:8787/health

# 1. start session
SESSION=$(curl -s -X POST http://localhost:8787/session/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"demo-user","scenario":"first_date"}')
echo "$SESSION"
SID=$(node -e "console.log(JSON.parse(process.argv[1]).sessionId)" "$SESSION")

# 2. baseline
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST "http://localhost:8787/session/$SID/baseline" \
  -H 'Content-Type: application/json' \
  -d '{"heartRate":71}'
# expect 204

# 3. spiked telemetry (|delta| >= 12)
curl -s -X POST "http://localhost:8787/session/$SID/telemetry" \
  -H 'Content-Type: application/json' \
  -d '{"heartRate":89,"breathingRate":14,"engagement":0.6}'
# expect {"delta":18,"flagged":true}

# 4. Custom LLM webhook — should inject SIGNAL and mention being thrown
curl -sN -X POST http://localhost:8787/llm/chat/completions \
  -H 'Content-Type: application/json' \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"why did your last relationship end?\"}],\"elevenlabs_extra_body\":{\"sessionId\":\"$SID\"},\"dynamic_variables\":{\"session_id\":\"$SID\"}}"
# expect SSE:
# data: {"id":"chatcmpl-1","object":"chat.completion.chunk","choices":[{"delta":{"content":"..."}}]}
# data: [DONE]
# Adaptive line should notice the spike lightly (e.g. "you seem a little thrown").

# 5. end + coach
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST "http://localhost:8787/session/$SID/end"
# expect 204

curl -s -X POST "http://localhost:8787/session/$SID/coach"
# expect { scores: { chemistry, conversation, composure, curiosity }, keyMoment, coaching }

curl -s "http://localhost:8787/session/$SID/timeline"
# expect array of { time, speaker, text, hr_delta, flagged }
```

Or: `npm run smoke` (same path, asserts shapes).

## Routes

| Method | Path | Response |
|---|---|---|
| POST | `/session/start` | `{ sessionId, priorPatterns }` |
| POST | `/session/:id/baseline` | 204 |
| POST | `/session/:id/telemetry` | `{ delta, flagged }` |
| GET | `/session/:id/timeline` | turn array |
| POST | `/session/:id/end` | 204 |
| POST | `/session/:id/coach` | scores + keyMoment + coaching |
| POST | `/llm/chat/completions` | OpenAI-style SSE |
| GET | `/health` | key / db status |

Architecture notes from the original scaffold: [STARTER.md](./STARTER.md).
Product contract: repo-root `FULL_PLAN.md`.
