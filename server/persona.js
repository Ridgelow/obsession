// Server-side Persona confirm for the 18+ Sign Up gate.
//
// The mobile Inquiry SDK (react-native-persona) only ever returns an
// inquiryId + status to the client — Persona deliberately keeps the data
// extracted off the scanned ID (name, birthdate, document fields) out of
// the client SDK. To actually check "does the ID say 18+" and "does the
// ID's date of birth match what the user typed", the server has to fetch
// the completed inquiry from Persona's API and read the extracted fields.
//
// Docs: https://docs.withpersona.com/reference/inquiries
//       https://docs.withpersona.com/docs/verification-fields
//
// The exact JSON shape below depends on the Persona Inquiry Template
// configured in the dashboard (which verification steps it runs, and
// whether birthdate is exposed as a top-level Field or nested under a
// government-id verification). findBirthdate() tries the common shapes;
// adjust it to match your template if Persona's response differs.

const PERSONA_API_BASE = "https://withpersona.com/api/v1";
const MIN_AGE = 18;

// Mirrors PERSONA_MOCK_INQUIRY_ID in mobile/src/services/personaConfig.ts.
// The mock path never opens a real Inquiry, so there is no ID to check —
// this trusts the claimed birthday the same honest way the client-side
// mock already does (labeled, never presented as a real Persona check).
const MOCK_INQUIRY_ID = "inq_mock_unconfigured";

export function hasPersonaApiKey() {
  return Boolean(process.env.PERSONA_API_KEY);
}

export function calculateAge(birthDate, now = new Date()) {
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function findBirthdate(payload) {
  const directField = payload?.data?.attributes?.fields?.birthdate?.value;
  if (directField) return directField;

  const topLevel = payload?.data?.attributes?.birthdate;
  if (topLevel) return topLevel;

  const included = Array.isArray(payload?.included) ? payload.included : [];
  for (const item of included) {
    const type = String(item?.type || "");
    if (!type.startsWith("verification/")) continue;
    const attrs = item?.attributes || {};
    const bd = attrs.birthdate || attrs.fields?.birthdate?.value;
    if (bd) return bd;
  }
  return null;
}

/**
 * Cross-checks a completed Persona Inquiry against the birthday the user
 * typed on Sign Up. Returns { verified, reason?, age?, idDateOfBirth? }.
 * `reason` (when verified is false) is one of: "not_configured",
 * "inquiry_not_complete", "no_birthdate_on_id", "dob_mismatch", "underage".
 */
export async function verifyAgeFromInquiry(inquiryId, claimedDob) {
  if (inquiryId === MOCK_INQUIRY_ID) {
    const age = calculateAge(new Date(claimedDob));
    return { verified: age >= MIN_AGE, mock: true, age, reason: age >= MIN_AGE ? null : "underage" };
  }

  if (!hasPersonaApiKey()) {
    console.warn("[persona] PERSONA_API_KEY unset — cannot confirm ID server-side");
    return { verified: false, reason: "not_configured" };
  }

  const res = await fetch(`${PERSONA_API_BASE}/inquiries/${inquiryId}`, {
    headers: {
      Authorization: `Bearer ${process.env.PERSONA_API_KEY}`,
      Accept: "application/json",
    },
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Persona /inquiries/${inquiryId} failed: ${res.status} ${raw}`);
  }
  const payload = JSON.parse(raw);

  const status = payload?.data?.attributes?.status;
  if (status !== "completed" && status !== "approved" && status !== "passed") {
    return { verified: false, reason: "inquiry_not_complete", status };
  }

  const idDateOfBirthRaw = findBirthdate(payload);
  if (!idDateOfBirthRaw) {
    return { verified: false, reason: "no_birthdate_on_id" };
  }
  const idDateOfBirth = String(idDateOfBirthRaw).slice(0, 10);

  if (idDateOfBirth !== claimedDob) {
    return { verified: false, reason: "dob_mismatch", idDateOfBirth };
  }

  const age = calculateAge(new Date(idDateOfBirth));
  if (age < MIN_AGE) {
    return { verified: false, reason: "underage", age, idDateOfBirth };
  }

  return { verified: true, age, idDateOfBirth };
}
