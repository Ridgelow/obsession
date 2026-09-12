import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateAge, findBirthdate, verifyAgeFromInquiry } from "./persona.js";

// The "real inquiry" tests below stub fetch, but verifyAgeFromInquiry checks
// PERSONA_API_KEY before ever calling it — set a fake one so those tests
// exercise the fetch path instead of short-circuiting to "not_configured".
process.env.PERSONA_API_KEY = "test-key";

test("calculateAge counts full years, not just year subtraction", () => {
  const now = new Date("2026-06-15");
  assert.equal(calculateAge(new Date("2000-06-15"), now), 26);
  assert.equal(calculateAge(new Date("2000-06-16"), now), 25); // birthday tomorrow
  assert.equal(calculateAge(new Date("2008-06-14"), now), 18); // turned 18 yesterday
});

test("findBirthdate reads the Fields API shape", () => {
  const payload = {
    data: { attributes: { fields: { birthdate: { value: "2000-01-01" } } } },
  };
  assert.equal(findBirthdate(payload), "2000-01-01");
});

test("findBirthdate reads a top-level attribute", () => {
  const payload = { data: { attributes: { birthdate: "1990-05-05" } } };
  assert.equal(findBirthdate(payload), "1990-05-05");
});

test("findBirthdate reads a nested government-id verification", () => {
  const payload = {
    data: { attributes: {} },
    included: [
      { type: "verification/government-id", attributes: { birthdate: "1985-03-03" } },
    ],
  };
  assert.equal(findBirthdate(payload), "1985-03-03");
});

test("findBirthdate returns null when nothing matches", () => {
  assert.equal(findBirthdate({ data: { attributes: {} } }), null);
});

test("verifyAgeFromInquiry: mock inquiry trusts claimed DOB", async () => {
  const now = new Date();
  const adultYear = now.getFullYear() - 25;
  const minorYear = now.getFullYear() - 10;

  const adult = await verifyAgeFromInquiry("inq_mock_unconfigured", `${adultYear}-01-01`);
  assert.equal(adult.verified, true);
  assert.equal(adult.mock, true);

  const minor = await verifyAgeFromInquiry("inq_mock_unconfigured", `${minorYear}-01-01`);
  assert.equal(minor.verified, false);
  assert.equal(minor.reason, "underage");
});

test("verifyAgeFromInquiry: real inquiry, DOB mismatch fails even if adult", async (t) => {
  t.mock.method(global, "fetch", async () =>
    new Response(
      JSON.stringify({
        data: {
          attributes: { status: "completed", fields: { birthdate: { value: "1990-01-01" } } },
        },
      }),
      { status: 200 }
    )
  );
  const result = await verifyAgeFromInquiry("inq_real123", "1990-01-02");
  assert.equal(result.verified, false);
  assert.equal(result.reason, "dob_mismatch");
  assert.equal(result.idDateOfBirth, "1990-01-01");
});

test("verifyAgeFromInquiry: real inquiry, matching DOB but underage fails", async (t) => {
  const minorYear = new Date().getFullYear() - 10;
  t.mock.method(global, "fetch", async () =>
    new Response(
      JSON.stringify({
        data: {
          attributes: {
            status: "completed",
            fields: { birthdate: { value: `${minorYear}-01-01` } },
          },
        },
      }),
      { status: 200 }
    )
  );
  const result = await verifyAgeFromInquiry("inq_real456", `${minorYear}-01-01`);
  assert.equal(result.verified, false);
  assert.equal(result.reason, "underage");
});

test("verifyAgeFromInquiry: real inquiry, matching DOB and 18+ passes", async (t) => {
  t.mock.method(global, "fetch", async () =>
    new Response(
      JSON.stringify({
        data: {
          attributes: { status: "completed", fields: { birthdate: { value: "1990-01-01" } } },
        },
      }),
      { status: 200 }
    )
  );
  const result = await verifyAgeFromInquiry("inq_real789", "1990-01-01");
  assert.equal(result.verified, true);
  assert.equal(result.idDateOfBirth, "1990-01-01");
});

test("verifyAgeFromInquiry: incomplete inquiry status fails closed", async (t) => {
  t.mock.method(global, "fetch", async () =>
    new Response(
      JSON.stringify({ data: { attributes: { status: "needs_review" } } }),
      { status: 200 }
    )
  );
  const result = await verifyAgeFromInquiry("inq_pending", "1990-01-01");
  assert.equal(result.verified, false);
  assert.equal(result.reason, "inquiry_not_complete");
});
