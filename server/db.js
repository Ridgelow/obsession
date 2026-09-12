import pg from "pg";
import { hasTigerUrl } from "./config.js";

// Tiger Data is Postgres + Timescale. A plain `pg` Pool is the client.
// When TIGER_DATA_URL is unset we keep an in-memory store so the server
// still boots and curl smoke tests are reviewable without secrets.

const connectionString = process.env.TIGER_DATA_URL;
const remote =
  Boolean(connectionString) &&
  !/localhost|127\.0\.0\.1/i.test(connectionString);

export const pool = connectionString
  ? new pg.Pool({
      connectionString,
      ssl: remote ? { rejectUnauthorized: false } : undefined,
    })
  : null;

export const dbMode = pool ? "tiger" : "memory";

const memory = {
  sessions: new Map(),
  telemetry: [],
  turns: [],
};

function dbHint() {
  return pool
    ? "Check TIGER_DATA_URL and that server/db/schema.sql has been run on Tiger Cloud."
    : "TIGER_DATA_URL is unset — using in-memory store (not durable).";
}

function wrapDbError(err) {
  const next = new Error(err.message);
  next.status = 503;
  next.hint = dbHint();
  next.cause = err;
  return next;
}

async function query(text, params = []) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    throw wrapDbError(err);
  }
}

export async function insertSession({ id, userId, scenario, priorPatterns }) {
  if (pool) {
    await query(
      `INSERT INTO sessions (id, user_id, scenario, prior_patterns)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, scenario, priorPatterns]
    );
    return;
  }
  memory.sessions.set(id, {
    id,
    user_id: userId,
    scenario,
    started_at: new Date(),
    ended_at: null,
    hr_baseline: null,
    scores: null,
    prior_patterns: priorPatterns,
  });
}

export async function getSession(id) {
  if (pool) {
    const { rows } = await query(`SELECT * FROM sessions WHERE id = $1`, [id]);
    return rows[0] || null;
  }
  return memory.sessions.get(id) || null;
}

export async function updateSession(id, fields) {
  const session = await getSession(id);
  if (!session) return null;

  if (pool) {
    const sets = [];
    const values = [];
    let i = 1;
    for (const [key, value] of Object.entries(fields)) {
      sets.push(`${key} = $${i++}`);
      values.push(value);
    }
    if (!sets.length) return session;
    values.push(id);
    const { rows } = await query(
      `UPDATE sessions SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  const next = { ...session, ...fields };
  memory.sessions.set(id, next);
  return next;
}

export async function insertTelemetry({
  sessionId,
  heartRate,
  breathingRate,
  engagement,
  source = "presage",
}) {
  if (pool) {
    await query(
      `INSERT INTO telemetry (session_id, heart_rate, breathing_rate, engagement, source)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, heartRate, breathingRate, engagement, source]
    );
    return;
  }
  memory.telemetry.push({
    time: new Date(),
    session_id: sessionId,
    heart_rate: heartRate,
    breathing_rate: breathingRate,
    engagement,
    source,
  });
}

export async function getLatestTelemetry(sessionId) {
  if (pool) {
    const { rows } = await query(
      `SELECT heart_rate, breathing_rate, engagement, time
       FROM telemetry WHERE session_id = $1
       ORDER BY time DESC LIMIT 1`,
      [sessionId]
    );
    return rows[0] || null;
  }
  const rows = memory.telemetry.filter((row) => row.session_id === sessionId);
  return rows.at(-1) || null;
}

export async function insertTurn({
  sessionId,
  speaker,
  text,
  hrBaseline = null,
  hrAtTurn = null,
  hrDelta = null,
  flagged = false,
}) {
  if (pool) {
    await query(
      `INSERT INTO conversation_turns
         (session_id, speaker, text, hr_baseline, hr_at_turn, hr_delta, flagged)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, speaker, text, hrBaseline, hrAtTurn, hrDelta, flagged]
    );
    return;
  }
  memory.turns.push({
    time: new Date(),
    session_id: sessionId,
    speaker,
    text,
    hr_baseline: hrBaseline,
    hr_at_turn: hrAtTurn,
    hr_delta: hrDelta,
    flagged,
  });
}

export async function listTurns(sessionId) {
  if (pool) {
    const { rows } = await query(
      `SELECT time, speaker, text, hr_baseline, hr_at_turn, hr_delta, flagged
       FROM conversation_turns
       WHERE session_id = $1
       ORDER BY time ASC`,
      [sessionId]
    );
    return rows;
  }
  return memory.turns
    .filter((row) => row.session_id === sessionId)
    .slice()
    .sort((a, b) => a.time - b.time);
}

export async function getLastTurn(sessionId) {
  const turns = await listTurns(sessionId);
  return turns.at(-1) || null;
}

export function describeDb() {
  return {
    mode: dbMode,
    hint: dbHint(),
  };
}

if (!hasTigerUrl()) {
  console.warn(
    "[db] TIGER_DATA_URL unset — in-memory store only. Data dies with the process."
  );
}
