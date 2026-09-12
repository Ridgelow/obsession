-- Run once against your Tiger Cloud (Tiger Data / TimescaleDB) service.
-- Tiger Data is Postgres + the TimescaleDB extension, so this is plain SQL
-- plus one `create_hypertable` call per time-series table.
--
-- In the Tiger SQL editor (or `psql $TIGER_DATA_URL`):
--   \i server/db/schema.sql

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  scenario        TEXT NOT NULL DEFAULT 'first_date',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,
  hr_baseline     DOUBLE PRECISION,
  scores          JSONB,          -- {chemistry, conversation, composure, curiosity}
  prior_patterns  TEXT            -- one-sentence Backboard recall at session start
);

CREATE TABLE IF NOT EXISTS telemetry (
  time            TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id      TEXT NOT NULL,
  heart_rate      DOUBLE PRECISION,
  breathing_rate  DOUBLE PRECISION,
  engagement      DOUBLE PRECISION,      -- 0-1, from Presage expression/engagement signal
  source          TEXT DEFAULT 'presage' -- 'presage' | 'simulator'
);
SELECT create_hypertable('telemetry', by_range('time'), if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS telemetry_session_idx ON telemetry (session_id, time DESC);

CREATE TABLE IF NOT EXISTS conversation_turns (
  time        TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id  TEXT NOT NULL,
  speaker     TEXT NOT NULL,          -- 'user' | 'ai'
  text        TEXT NOT NULL,
  hr_baseline DOUBLE PRECISION,
  hr_at_turn  DOUBLE PRECISION,
  hr_delta    DOUBLE PRECISION,
  flagged     BOOLEAN DEFAULT FALSE   -- true when this turn crossed the deviation threshold
);
SELECT create_hypertable('conversation_turns', by_range('time'), if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS turns_session_idx ON conversation_turns (session_id, time);

-- Safe to re-run if you already created sessions before prior_patterns existed.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS prior_patterns TEXT;
