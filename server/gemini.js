import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL, hasGeminiKey } from "./config.js";
import { parseJsonLoose } from "./util.js";

// Scenario prompts — swap the string, ship a new scenario.
// LOCKED copy rules: warm, slightly guarded; 1–3 spoken sentences.
// SIGNAL: notice lightly — never "I know you're scared." Prefer "you seem a little thrown."

const SIGNAL_RULES = `You will sometimes receive a note in brackets like [SIGNAL: heart rate jumped
18bpm on this question] describing the other person's physiological reaction to what YOU
just asked or said. When you see one, let it inform your NEXT line the way a perceptive
date would — notice the shift, maybe name it lightly, maybe soften or lean in — but never
claim certainty about their emotions ("you seem a little thrown by that" not "you're
scared"). Keep replies to 1-3 sentences, spoken out loud, not written.`;

const SCENARIO_PROMPTS = {
  first_date: `You are playing a warm, slightly guarded person on a
first date at a coffee shop. Stay fully in character — natural, a little witty, with real
opinions. ${SIGNAL_RULES}`,

  coffee_chat: `You are on a casual coffee chat — same warmth as a first date, a notch
more relaxed, still a little guarded. Stay fully in character. Ask curious questions and
have real opinions. ${SIGNAL_RULES}`,

  silence: `You are on a first date where silences are allowed to exist. You are warm,
slightly guarded, and comfortable with a pause. When you speak, keep it intimate and
unrushed — do not fill every gap. ${SIGNAL_RULES}`,
};

let client = null;

function getClient() {
  if (!hasGeminiKey()) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

function systemPrompt(scenario, priorPatterns) {
  const base = SCENARIO_PROMPTS[scenario] || SCENARIO_PROMPTS.first_date;
  if (!priorPatterns) return base;
  return `${base}\n\nWhat you know about this person from past practice
dates (use subtly, don't announce it): ${priorPatterns}`;
}

export function fallbackDateLine({ latestSignal }) {
  if (latestSignal) {
    return "You seem a little thrown by that — we can sit with it a second if you want.";
  }
  return "That's a real answer. What made you say yes to tonight?";
}

export function fallbackCoach(transcriptWithSignals = "") {
  const spiked = /HR SPIKE|SIGNAL|heart rate/i.test(transcriptWithSignals);
  return {
    scores: {
      chemistry: 72,
      conversation: 65,
      composure: spiked ? 54 : 70,
      curiosity: 80,
    },
    keyMoment: spiked
      ? "0:42 — asked about your last relationship"
      : "the pause after a personal question",
    coaching:
      "You recovered well after the pause — but the answer trailed off. Try landing on one clear sentence next time, without claiming you know what they felt.",
  };
}

// Used by the ElevenLabs agent's custom-LLM webhook: given the running transcript
// plus the latest physiological signal, produce the date's next line.
export async function nextDateLine({
  history = [],
  latestSignal,
  priorPatterns,
  scenario = "first_date",
}) {
  const ai = getClient();
  if (!ai) {
    console.warn("[gemini] GEMINI_API_KEY unset — using fallback date line");
    return fallbackDateLine({ latestSignal });
  }

  const contents = [
    ...history
      .filter((turn) => turn?.text)
      .map((turn) => ({
        role: turn.speaker === "ai" ? "model" : "user",
        parts: [{ text: turn.text }],
      })),
  ];

  if (latestSignal) {
    contents.push({
      role: "user",
      parts: [{ text: `[SIGNAL: ${latestSignal}]` }],
    });
  }

  if (!contents.length) {
    contents.push({
      role: "user",
      parts: [{ text: "(they just sat down — start the date, one spoken line)" }],
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: { systemInstruction: systemPrompt(scenario, priorPatterns) },
    });
    const text = (response.text || "").trim();
    return text || fallbackDateLine({ latestSignal });
  } catch (err) {
    console.error("[gemini] nextDateLine failed:", err.message);
    return fallbackDateLine({ latestSignal });
  }
}

// Post-session coaching + the four scores shown on the Results screen.
// Coaching: JSON only; no emotion certainty claims.
export async function coachSession({ transcriptWithSignals }) {
  const fallback = fallbackCoach(transcriptWithSignals);
  const ai = getClient();
  if (!ai) {
    console.warn("[gemini] GEMINI_API_KEY unset — using fallback coaching JSON");
    return fallback;
  }

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Here is a full practice-date transcript, with physiological signal
              annotations where the person's heart rate spiked:

              ${transcriptWithSignals || "(no turns recorded)"}

              Score this person 0-100 on four axes: chemistry, conversation, composure,
              curiosity. Then write 2-3 sentences of specific, concrete coaching about
              ONE moment — quote or paraphrase the moment where their heart rate spiked,
              and coach the actual answer and delivery, never claiming to know their
              emotions with certainty. Respond as strict JSON:
              {"scores":{"chemistry":n,"conversation":n,"composure":n,"curiosity":n},
              "keyMoment":"...","coaching":"..."}`,
            },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });

    const parsed = parseJsonLoose(response.text);
    return {
      scores: {
        chemistry: Number(parsed.scores?.chemistry ?? fallback.scores.chemistry),
        conversation: Number(
          parsed.scores?.conversation ?? fallback.scores.conversation
        ),
        composure: Number(parsed.scores?.composure ?? fallback.scores.composure),
        curiosity: Number(parsed.scores?.curiosity ?? fallback.scores.curiosity),
      },
      keyMoment: parsed.keyMoment || fallback.keyMoment,
      coaching: parsed.coaching || fallback.coaching,
    };
  } catch (err) {
    console.error("[gemini] coachSession failed:", err.message);
    return fallback;
  }
}
