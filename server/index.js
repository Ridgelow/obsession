import "dotenv/config";
import express from "express";
import cors from "cors";
import { sessionRouter } from "./routes/session.js";
import { telemetryRouter } from "./routes/telemetry.js";
import { llmWebhookRouter } from "./routes/llmWebhook.js";
import { coachingRouter } from "./routes/coaching.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use(sessionRouter);
app.use(telemetryRouter);
app.use(llmWebhookRouter);
app.use(coachingRouter);

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`obsession-server listening on :${port}`));
