import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The "first date" persona. Different scenarios (coffee chat, awkward silence)
// are just different system prompts — swap this string, ship a new scenario.
const FIRST_DATE_SYSTEM_PROMPT = `You are playing a warm, slightly guarded person on a
first date at a coffee shop. Stay fully in character — natural, a little witty, with real
opinions. You will sometimes receive a note in brackets like [SIGNAL: heart rate jumped
18bpm on this question] describing the other person's physiological reaction to what YOU
just asked or said. When you see one, let it inform your NEXT line the way a perceptive
date would — notice the shift, maybe name it lightly, maybe soften or lean in — but never
claim certainty about their emotions ("you seem a little thrown by that" not "you're
scared"). Keep replies to 1-3 sentences, spoken out loud, not written.`;

// Used by the ElevenLabs agent's custom-LLM webhook: given the running transcript
// plus the latest physiological signal, produce the date's next line.
export async function nextDateLine({ history, latestSignal, priorPatterns }) {
  const contents = [
    ...history.map((turn) => ({
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

  const systemInstruction = priorPatterns
    ? `${FIRST_DATE_SYSTEM_PROMPT}\n\nWhat you know about this person from past practice
       dates (use subtly, don't announce it): ${priorPatterns}`
    : FIRST_DATE_SYSTEM_PROMPT;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: { systemInstruction },
  });
  return response.text;
}

// Post-session coaching + the four scores shown on the Results screen.
export async function coachSession({ transcriptWithSignals }) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Here is a full practice-date transcript, with physiological signal
              annotations where the person's heart rate spiked:

              ${transcriptWithSignals}

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
  return JSON.parse(response.text);
}
