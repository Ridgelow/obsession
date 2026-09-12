import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractMessageText,
  formatElapsed,
  normalizeScenario,
  parseJsonLoose,
  resolveSessionId,
} from "./util.js";

test("normalizeScenario maps Home pills to API keys", () => {
  assert.equal(normalizeScenario("First Date"), "first_date");
  assert.equal(normalizeScenario("Coffee Chat"), "coffee_chat");
  assert.equal(normalizeScenario("Silence"), "silence");
});

test("resolveSessionId accepts extra_body or dynamic_variables", () => {
  assert.equal(
    resolveSessionId({ elevenlabs_extra_body: { sessionId: "a" } }),
    "a"
  );
  assert.equal(
    resolveSessionId({ dynamic_variables: { session_id: "b" } }),
    "b"
  );
});

test("extractMessageText handles OpenAI string and parts", () => {
  assert.equal(extractMessageText("hello"), "hello");
  assert.equal(
    extractMessageText([{ type: "text", text: "hey" }]),
    "hey"
  );
});

test("formatElapsed matches Results timestamps", () => {
  assert.equal(formatElapsed(new Date(0), new Date(42_000)), "0:42");
});

test("parseJsonLoose strips markdown fences", () => {
  assert.deepEqual(parseJsonLoose("```json\n{\"a\":1}\n```"), { a: 1 });
});
