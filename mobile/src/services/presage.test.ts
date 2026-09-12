import {
  createVitalsSimulator,
  isPresageConfigured,
  presageApiKey,
  vitalsFallbackHint,
} from "./presageConfig";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function run(): void {
  const prev = process.env.EXPO_PUBLIC_PRESAGE_API_KEY;
  process.env.EXPO_PUBLIC_PRESAGE_API_KEY = "";
  assert(isPresageConfigured() === false, "empty key not configured");
  assert(presageApiKey() === "", "empty key");
  assert(
    vitalsFallbackHint("missing_key")?.includes("EXPO_PUBLIC_PRESAGE_API_KEY"),
    "missing key hint"
  );
  assert(
    vitalsFallbackHint("native_unavailable")?.includes("simulated"),
    "native hint"
  );
  assert(vitalsFallbackHint(null) === null, "no hint when live");

  process.env.EXPO_PUBLIC_PRESAGE_API_KEY = "  pk_test  ";
  assert(isPresageConfigured() === true, "key present");
  assert(presageApiKey() === "pk_test", "key trims");

  const sim = createVitalsSimulator(71);
  const first = sim.tick();
  assert(first.source === "simulator", "simulator tags source");
  assert(first.heartRate === 71, "t=1 stays at baseline");
  for (let i = 0; i < 11; i += 1) sim.tick();
  assert(sim.tick().heartRate === 78, "t=13 climbs +7");
  for (let i = 0; i < 7; i += 1) sim.tick();
  assert(sim.tick().heartRate === 84, "t=21 climbs +13");
  for (let i = 0; i < 7; i += 1) sim.tick();
  assert(sim.tick().heartRate === 89, "t=29 climbs +18");

  if (prev === undefined) delete process.env.EXPO_PUBLIC_PRESAGE_API_KEY;
  else process.env.EXPO_PUBLIC_PRESAGE_API_KEY = prev;

  console.log("presage tests passed");
}

run();
