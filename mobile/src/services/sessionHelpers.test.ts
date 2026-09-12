import {
  averageHeartRate,
  isCoachResponse,
  latestAiLine,
  mapScenario,
  normalizeTimeline,
  shouldShowNerves,
} from "./sessionHelpers";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function run(): void {
  assert(mapScenario("First Date") === "first_date", "First Date maps");
  assert(mapScenario("Coffee Chat") === "coffee_chat", "Coffee Chat maps");
  assert(mapScenario("Silence") === "silence", "Silence maps");
  assert(mapScenario("nope") === "first_date", "unknown scenario defaults");

  assert(averageHeartRate([70, 72, 74]) === 72, "average rounds");
  assert(averageHeartRate([]) === 0, "empty average is 0");

  assert(shouldShowNerves(true, 0) === true, "API flagged shows nerves");
  assert(shouldShowNerves(false, 12) === true, "local delta 12 shows nerves");
  assert(shouldShowNerves(false, -12) === true, "negative delta shows nerves");
  assert(shouldShowNerves(false, 11) === false, "delta 11 stays quiet");

  const wrapped = normalizeTimeline({
    turns: [
      {
        time: "0:12",
        speaker: "user",
        text: "hi",
        hr_delta: 2,
        flagged: false,
      },
      {
        time: "0:42",
        speaker: "ai",
        text: "You seem a little thrown.",
        hr_delta: 14,
        flagged: true,
      },
    ],
  });
  assert(wrapped.length === 2, "wrapped turns parse");
  assert(
    latestAiLine(wrapped) === "You seem a little thrown.",
    "latest AI line"
  );

  const bare = normalizeTimeline([
    { speaker: "assistant", text: "Coffee?", flagged: 0 },
  ]);
  assert(bare[0].speaker === "assistant", "bare array parses");
  assert(latestAiLine(bare) === "Coffee?", "assistant counts as AI");
  assert(bare[0].flagged === false, "0 is not flagged");

  assert(normalizeTimeline(null).length === 0, "null timeline is empty");
  assert(latestAiLine([]) === null, "empty timeline has no fake AI line");

  assert(
    isCoachResponse({
      scores: {
        chemistry: 70,
        conversation: 60,
        composure: 50,
        curiosity: 80,
      },
      keyMoment: "x",
      coaching: "y",
    }),
    "valid coach payload"
  );
  assert(isCoachResponse({ scores: { chemistry: 1 } }) === false, "partial scores");

  console.log("sessionHelpers tests passed");
}

run();
