import "dotenv/config";
import express from "express";
import cors from "cors";
import { sessionRouter } from "./routes/session.js";
import { telemetryRouter } from "./routes/telemetry.js";
import { llmWebhookRouter } from "./routes/llmWebhook.js";
import { coachingRouter } from "./routes/coaching.js";
import { personaRouter } from "./routes/persona.js";
import { PORT, hasBackboardKeys, hasGeminiKey } from "./config.js";
import { describeDb } from "./db.js";
import { hasPersonaApiKey } from "./persona.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  const db = describeDb();
  res.json({
    ok: true,
    service: "obsession-server",
    port: PORT,
    db: db.mode,
    gemini: hasGeminiKey(),
    backboard: hasBackboardKeys(),
    persona: hasPersonaApiKey(),
  });
});

app.use(sessionRouter);
app.use(telemetryRouter);
app.use(llmWebhookRouter);
app.use(coachingRouter);
app.use(personaRouter);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  console.error("[http]", status, err.message);
  res.status(status).json({
    error: err.message || "internal error",
    hint: err.hint,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  const db = describeDb();
  console.log(`obsession-server listening on :${PORT}`);
  console.log(
    `[boot] db=${db.mode} gemini=${hasGeminiKey()} backboard=${hasBackboardKeys()} persona=${hasPersonaApiKey()}`
  );
  if (db.mode === "memory") console.warn(`[boot] ${db.hint}`);
  if (!hasGeminiKey()) {
    console.warn(
      "[boot] GEMINI_API_KEY unset — nextDateLine / coachSession use fallback copy"
    );
  }
  if (!hasPersonaApiKey()) {
    console.warn(
      "[boot] PERSONA_API_KEY unset — /persona/verify-age only trusts the mock inquiry, real IDs will fail age check"
    );
  }
});
