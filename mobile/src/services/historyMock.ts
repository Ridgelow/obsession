import type { HistoryEntry } from "./historyStorage";
import type { CoachScores } from "./sessionHelpers";

function scores(
  chemistry: number,
  conversation: number,
  composure: number,
  curiosity: number
): CoachScores {
  return { chemistry, conversation, composure, curiosity };
}

/** Days ago → ISO timestamp (afternoon-ish for variety). */
function daysAgo(days: number, hour = 18, minute = 24): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 12, 0);
  return d.toISOString();
}

type Turn = { speaker: "user" | "ai"; text: string };

function turns(...pairs: Turn[]): Turn[] {
  return pairs;
}

/**
 * Seeded practice-date history for demos / empty installs.
 * Real sessions from Results are merged on top and never overwritten.
 * Every mock includes a full conversation transcript for Results.
 */
export const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "mock-01",
    sessionId: "mock-sess-01",
    scenario: "First Date",
    personality: "Warm",
    completedAt: daysAgo(0, 16, 42),
    scores: scores(82, 78, 71, 88),
    keyMoment: "0:41 — asked what she’s actually looking for",
    coaching:
      "You landed the soft question cleanly — next time hold eye contact one beat longer after she answers.",
    turns: turns(
      { speaker: "ai", text: "Hey — thanks for meeting me. How’s your week been?" },
      {
        speaker: "user",
        text: "Pretty good, actually. Finished a big project and finally slept.",
      },
      {
        speaker: "ai",
        text: "Sleep counts as a win. What does a good week look like for you when work isn’t loud?",
      },
      {
        speaker: "user",
        text: "Cooking something slow, walking without my phone. Boring in a nice way.",
      },
      {
        speaker: "ai",
        text: "I like boring-nice. Can I ask — what are you actually looking for right now?",
      },
      {
        speaker: "user",
        text: "Someone I can be quiet with. And also someone who notices when I’m quiet for the wrong reasons.",
      },
      {
        speaker: "ai",
        text: "That’s a really clear answer. I heard both parts.",
      }
    ),
  },
  {
    id: "mock-02",
    sessionId: "mock-sess-02",
    scenario: "Coffee Chat",
    personality: "Witty",
    completedAt: daysAgo(0, 11, 8),
    scores: scores(74, 86, 69, 80),
    keyMoment: "1:12 — matched her tease instead of apologizing",
    coaching:
      "Banter clicked. Don’t undercut a good line with ‘just kidding’ — let it sit.",
    turns: turns(
      {
        speaker: "ai",
        text: "Okay, honest review — this coffee is doing the absolute most.",
      },
      {
        speaker: "user",
        text: "It’s basically a personality test in a cup.",
      },
      {
        speaker: "ai",
        text: "And you ordered oat. Bold claim about your character.",
      },
      {
        speaker: "user",
        text: "Says the woman who asked for extra foam like it’s a personality trait.",
      },
      {
        speaker: "ai",
        text: "Touché. Do you always clap back this fast, or am I special?",
      },
      {
        speaker: "user",
        text: "You’re special. The clap-back is free with the oat milk.",
      }
    ),
  },
  {
    id: "mock-03",
    sessionId: "mock-sess-03",
    scenario: "Silence",
    personality: "Guarded",
    completedAt: daysAgo(1, 20, 15),
    scores: scores(58, 61, 79, 55),
    keyMoment: "0:28 — sat in the pause without filling it",
    coaching:
      "Composure was the win. Add one curious follow-up so silence doesn’t stall the date.",
    turns: turns(
      { speaker: "ai", text: "So… yeah." },
      { speaker: "user", text: "Yeah." },
      {
        speaker: "ai",
        text: "I don’t always know what to say when someone is actually listening.",
      },
      {
        speaker: "user",
        text: "We can sit with that. I’m not in a rush.",
      },
      {
        speaker: "ai",
        text: "Most people fill it. You didn’t.",
      },
      {
        speaker: "user",
        text: "What usually makes you go quiet like that?",
      }
    ),
  },
  {
    id: "mock-04",
    sessionId: "mock-sess-04",
    scenario: "First Date",
    personality: "Flirty",
    completedAt: daysAgo(1, 19, 3),
    scores: scores(90, 72, 64, 84),
    keyMoment: "1:04 — complimented her laugh, then asked why",
    coaching:
      "Chemistry spiked. Keep the flirty beat, but ask one grounded question so it doesn’t float.",
    turns: turns(
      {
        speaker: "ai",
        text: "You keep looking at me like you’re deciding something.",
      },
      {
        speaker: "user",
        text: "I am. Mostly whether your laugh is always that dangerous.",
      },
      {
        speaker: "ai",
        text: "Dangerous? That’s a new one. Why’d you say that?",
      },
      {
        speaker: "user",
        text: "Because it made me forget whatever clever thing I was about to say.",
      },
      {
        speaker: "ai",
        text: "I’ll take that as a win. Tell me something un-clever about you.",
      },
      {
        speaker: "user",
        text: "I rehearse grocery lists out loud in the car. Extensively.",
      }
    ),
  },
  {
    id: "mock-05",
    sessionId: "mock-sess-05",
    scenario: "Coffee Chat",
    personality: "Warm",
    completedAt: daysAgo(2, 14, 50),
    scores: scores(68, 70, 66, 73),
    keyMoment: "0:55 — pivoted from work talk to weekend plans",
    coaching:
      "Solid redirect. Try naming what you enjoyed about her answer before the next question.",
    turns: turns(
      {
        speaker: "ai",
        text: "Work’s been a blur — back-to-back calls, the usual.",
      },
      {
        speaker: "user",
        text: "We can leave work at work. What’s one thing you’re looking forward to this weekend?",
      },
      {
        speaker: "ai",
        text: "There’s a farmers market I keep meaning to go to. And maybe a long walk if it doesn’t rain.",
      },
      {
        speaker: "user",
        text: "That sounds like my kind of pace. Favorite stall if you’ve been before?",
      },
      {
        speaker: "ai",
        text: "The one with the ridiculous peaches. I buy too many every time.",
      }
    ),
  },
  {
    id: "mock-06",
    sessionId: "mock-sess-06",
    scenario: "Silence",
    personality: "Witty",
    completedAt: daysAgo(2, 21, 30),
    scores: scores(63, 81, 58, 77),
    keyMoment: "0:19 — joked through a dead air stretch",
    coaching:
      "Humor saved the beat — once. Next silence, try a quieter observation instead of another joke.",
    turns: turns(
      { speaker: "ai", text: "…" },
      {
        speaker: "user",
        text: "If this silence had a soundtrack, it’d be elevator jazz apologizing.",
      },
      {
        speaker: "ai",
        text: "Wow. You’re going to roast the quiet itself?",
      },
      {
        speaker: "user",
        text: "Only if it can take a joke. Can it?",
      },
      {
        speaker: "ai",
        text: "Apparently yes. Okay — what’s something you never joke about?",
      },
      {
        speaker: "user",
        text: "People’s grief. And my grandma’s cooking. Both sacred.",
      }
    ),
  },
  {
    id: "mock-07",
    sessionId: "mock-sess-07",
    scenario: "First Date",
    personality: "Guarded",
    completedAt: daysAgo(3, 18, 12),
    scores: scores(51, 54, 72, 60),
    keyMoment: "1:22 — pressed on her ex after a short answer",
    coaching:
      "You felt the wall and pushed anyway. Mirror her length first; earn the deeper ask.",
    turns: turns(
      {
        speaker: "ai",
        text: "I’ve dated. It ended. That’s the short version.",
      },
      {
        speaker: "user",
        text: "What was the longer version? Like, what actually happened?",
      },
      {
        speaker: "ai",
        text: "I’d rather not get into it tonight.",
      },
      {
        speaker: "user",
        text: "Come on — was it messy? Who left?",
      },
      {
        speaker: "ai",
        text: "You’re asking a lot for a first conversation.",
      },
      {
        speaker: "user",
        text: "Fair. We can leave it.",
      }
    ),
  },
  {
    id: "mock-08",
    sessionId: "mock-sess-08",
    scenario: "Coffee Chat",
    personality: "Flirty",
    completedAt: daysAgo(4, 13, 5),
    scores: scores(85, 76, 70, 79),
    keyMoment: "0:47 — ‘I’d steal that seat again’ landed",
    coaching:
      "Playful claim worked. Follow with something specific about her — not another line about you.",
    turns: turns(
      {
        speaker: "ai",
        text: "You know you took my usual seat, right?",
      },
      {
        speaker: "user",
        text: "I’d steal that seat again. The view’s better from here.",
      },
      {
        speaker: "ai",
        text: "The view being… me?",
      },
      {
        speaker: "user",
        text: "Among other attractions. The latte art’s fine too.",
      },
      {
        speaker: "ai",
        text: "Smooth. Dangerous, but smooth.",
      }
    ),
  },
  {
    id: "mock-09",
    sessionId: "mock-sess-09",
    scenario: "Silence",
    personality: "Warm",
    completedAt: daysAgo(5, 17, 44),
    scores: scores(70, 65, 84, 68),
    keyMoment: "0:33 — ‘take your time’ after she stalled",
    coaching:
      "Permission to pause is rare and kind. Pair it with a soft prompt so she has a ramp back in.",
    turns: turns(
      {
        speaker: "ai",
        text: "I was going to say something and it just… left.",
      },
      {
        speaker: "user",
        text: "Take your time. I’m not going anywhere.",
      },
      { speaker: "ai", text: "Okay. Thanks." },
      {
        speaker: "user",
        text: "Whenever it comes back, I’m curious what it was.",
      },
      {
        speaker: "ai",
        text: "It was about how rare it feels to not be rushed.",
      }
    ),
  },
  {
    id: "mock-10",
    sessionId: "mock-sess-10",
    scenario: "First Date",
    personality: "Witty",
    completedAt: daysAgo(6, 19, 20),
    scores: scores(77, 88, 61, 82),
    keyMoment: "1:18 — callback to her terrible first-job story",
    coaching:
      "Great memory use. On the next callback, invite her to finish the thought instead of capping it.",
    turns: turns(
      {
        speaker: "ai",
        text: "My first job was so bad I still flinch at name tags.",
      },
      {
        speaker: "user",
        text: "You mentioned the name-tag trauma earlier — was it retail or food?",
      },
      {
        speaker: "ai",
        text: "Ice cream shop. Sticky floors. Sticky dignity.",
      },
      {
        speaker: "user",
        text: "So when you said you hate forced cheer, that tracks.",
      },
      {
        speaker: "ai",
        text: "You were actually listening. Rude of you to be competent.",
      }
    ),
  },
  {
    id: "mock-11",
    sessionId: "mock-sess-11",
    scenario: "Coffee Chat",
    personality: "Guarded",
    completedAt: daysAgo(7, 12, 10),
    scores: scores(49, 57, 75, 52),
    keyMoment: "0:50 — answered her question with a speech",
    coaching:
      "She went short; you went long. Match her bandwidth — two sentences, then a question.",
    turns: turns(
      { speaker: "ai", text: "What do you do?" },
      {
        speaker: "user",
        text: "Oh — so I work in product, mostly growth experiments, but I started in support which taught me a lot about patience and systems, and then I moved into analytics, and now I lead a small pod that ships weekly, which is chaotic but I love the pace, and honestly the team culture is what keeps me there even when the roadmap gets weird…",
      },
      { speaker: "ai", text: "That’s… a lot." },
      {
        speaker: "user",
        text: "Sorry. What about you — shorter version?",
      },
      { speaker: "ai", text: "Design. I keep it brief on purpose." }
    ),
  },
  {
    id: "mock-12",
    sessionId: "mock-sess-12",
    scenario: "First Date",
    personality: "Warm",
    completedAt: daysAgo(8, 20, 0),
    scores: scores(80, 74, 77, 81),
    keyMoment: "0:36 — shared a real fear without oversharing",
    coaching:
      "Balanced vulnerability. Leave one detail unfinished so she can step toward you.",
    turns: turns(
      {
        speaker: "ai",
        text: "First dates make me nervous in a dumb way.",
      },
      {
        speaker: "user",
        text: "Same. I’m afraid of being interesting for an hour and forgettable after.",
      },
      {
        speaker: "ai",
        text: "That’s a very specific fear.",
      },
      {
        speaker: "user",
        text: "I’ve lived it once. Trying not to perform my way into it again.",
      },
      {
        speaker: "ai",
        text: "You’re not performing right now. For what it’s worth.",
      }
    ),
  },
  {
    id: "mock-13",
    sessionId: "mock-sess-13",
    scenario: "Silence",
    personality: "Flirty",
    completedAt: daysAgo(9, 22, 18),
    scores: scores(72, 69, 55, 86),
    keyMoment: "1:01 — held her gaze through quiet",
    coaching:
      "Charge was there; composure dipped. Breathe before the next line so curiosity stays sharp.",
    turns: turns(
      { speaker: "ai", text: "You’re staring." },
      { speaker: "user", text: "I know." },
      { speaker: "ai", text: "And you’re not explaining yourself." },
      {
        speaker: "user",
        text: "Do I need to?",
      },
      {
        speaker: "ai",
        text: "Not yet. Ask me something real before I get dizzy.",
      },
      {
        speaker: "user",
        text: "When was the last time someone looked at you like this and you liked it?",
      }
    ),
  },
  {
    id: "mock-14",
    sessionId: "mock-sess-14",
    scenario: "Coffee Chat",
    personality: "Witty",
    completedAt: daysAgo(10, 15, 33),
    scores: scores(66, 83, 71, 75),
    keyMoment: "0:22 — opened with a dry take on the playlist",
    coaching:
      "Strong cold open. Build a bridge from the joke into something she cares about.",
    turns: turns(
      {
        speaker: "user",
        text: "This playlist is aggressively trying to set a mood.",
      },
      {
        speaker: "ai",
        text: "It’s giving ‘we’re all main characters.’ I’m embarrassed for us.",
      },
      {
        speaker: "user",
        text: "What’s your actual taste when nobody’s curating?",
      },
      {
        speaker: "ai",
        text: "Sad girl indie and one inexplicable pop song I will die defending.",
      },
      {
        speaker: "user",
        text: "Name the pop song. For science.",
      }
    ),
  },
  {
    id: "mock-15",
    sessionId: "mock-sess-15",
    scenario: "First Date",
    personality: "Guarded",
    completedAt: daysAgo(12, 18, 55),
    scores: scores(44, 48, 68, 50),
    keyMoment: "0:15 — filled every gap with another question",
    coaching:
      "Interview mode kicked in. Plant one statement about yourself between asks.",
    turns: turns(
      { speaker: "ai", text: "Hi." },
      { speaker: "user", text: "Hi — where are you from originally?" },
      { speaker: "ai", text: "Nearby." },
      { speaker: "user", text: "And what do you do? Siblings? Pets?" },
      { speaker: "ai", text: "This feels like a form." },
      {
        speaker: "user",
        text: "Sorry. Habit. I get nervous and turn into HR.",
      }
    ),
  },
  {
    id: "mock-16",
    sessionId: "mock-sess-16",
    scenario: "Silence",
    personality: "Warm",
    completedAt: daysAgo(13, 21, 7),
    scores: scores(73, 67, 88, 71),
    keyMoment: "1:30 — recovered after a 6-second freeze",
    coaching:
      "Recovery was graceful. Name the freeze lightly next time — it humanizes you.",
    turns: turns(
      {
        speaker: "ai",
        text: "Do you ever blank completely mid-sentence?",
      },
      { speaker: "user", text: "…" },
      {
        speaker: "user",
        text: "Ironically, yes. Including just now. Lost the thread.",
      },
      {
        speaker: "ai",
        text: "You’re smiling about it. That’s cute.",
      },
      {
        speaker: "user",
        text: "Better than pretending I had a point. Where were we?",
      },
      {
        speaker: "ai",
        text: "Blanking. And whether it’s allowed.",
      }
    ),
  },
  {
    id: "mock-17",
    sessionId: "mock-sess-17",
    scenario: "Coffee Chat",
    personality: "Flirty",
    completedAt: daysAgo(14, 16, 2),
    scores: scores(88, 79, 73, 85),
    keyMoment:
      "0:58 — asked if she’d show you her favorite corner of the city",
    coaching:
      "Future-facing invite without pressure. Keep that energy — concrete, not clingy.",
    turns: turns(
      {
        speaker: "ai",
        text: "I love this neighborhood more than I admit.",
      },
      {
        speaker: "user",
        text: "Then show me your favorite corner of the city sometime — no pressure, just a claim.",
      },
      {
        speaker: "ai",
        text: "A claim? You’re bold for a latte date.",
      },
      {
        speaker: "user",
        text: "Only if you want to prove the neighborhood deserves the hype.",
      },
      {
        speaker: "ai",
        text: "I might. Don’t make me put it on the calendar yet.",
      }
    ),
  },
  {
    id: "mock-18",
    sessionId: "mock-sess-18",
    scenario: "First Date",
    personality: "Witty",
    completedAt: daysAgo(16, 19, 40),
    scores: scores(71, 90, 60, 78),
    keyMoment: "1:09 — roasted yourself before she could",
    coaching:
      "Self-roast worked once. Don’t stack them — leave room for her to like you unironically.",
    turns: turns(
      {
        speaker: "ai",
        text: "You seem very put together.",
      },
      {
        speaker: "user",
        text: "It’s a costume. Underneath I’m three Google Docs and a prayer.",
      },
      {
        speaker: "ai",
        text: "At least you’re self-aware about the chaos.",
      },
      {
        speaker: "user",
        text: "And slightly proud. Don’t tell my therapist.",
      },
      {
        speaker: "ai",
        text: "Your secret’s safe. Mostly because it’s funny.",
      }
    ),
  },
  {
    id: "mock-19",
    sessionId: "mock-sess-19",
    scenario: "Silence",
    personality: "Guarded",
    completedAt: daysAgo(18, 20, 25),
    scores: scores(40, 43, 81, 39),
    keyMoment: "0:40 — went quiet when she mentioned family",
    coaching:
      "You protected composure and lost curiosity. A small ‘tell me more about them’ reopens the door.",
    turns: turns(
      {
        speaker: "ai",
        text: "My family’s… complicated. Close, but complicated.",
      },
      { speaker: "user", text: "…" },
      { speaker: "ai", text: "Did I say something wrong?" },
      {
        speaker: "user",
        text: "No. I just didn’t want to pry.",
      },
      {
        speaker: "ai",
        text: "You can pry a little. I’d rather that than the freeze.",
      }
    ),
  },
  {
    id: "mock-20",
    sessionId: "mock-sess-20",
    scenario: "Coffee Chat",
    personality: "Warm",
    completedAt: daysAgo(20, 13, 48),
    scores: scores(76, 72, 74, 80),
    keyMoment: "0:29 — remembered her sister’s name from earlier",
    coaching:
      "Detail memory builds trust fast. Use it sparingly so it stays special.",
    turns: turns(
      {
        speaker: "ai",
        text: "My sister Maya keeps sending me apartment listings I can’t afford.",
      },
      {
        speaker: "user",
        text: "Maya sounds like a menace in the best way.",
      },
      {
        speaker: "ai",
        text: "Wait — I only said her name once.",
      },
      {
        speaker: "user",
        text: "It stuck. Important people usually do.",
      },
      {
        speaker: "ai",
        text: "Okay. That was quietly impressive.",
      }
    ),
  },
  {
    id: "mock-21",
    sessionId: "mock-sess-21",
    scenario: "First Date",
    personality: "Flirty",
    completedAt: daysAgo(22, 21, 11),
    scores: scores(92, 70, 59, 83),
    keyMoment: "1:15 — ‘you make this easy’ — then silence",
    coaching:
      "Line was hot; the silence after was colder. Add a soft question so she can catch it.",
    turns: turns(
      {
        speaker: "user",
        text: "You make this easy.",
      },
      { speaker: "ai", text: "…" },
      {
        speaker: "ai",
        text: "You can’t just say that and then go quiet.",
      },
      {
        speaker: "user",
        text: "Sorry — I meant it. What part of tonight has felt easy for you?",
      },
      {
        speaker: "ai",
        text: "Talking. And not pretending I don’t like talking.",
      }
    ),
  },
  {
    id: "mock-22",
    sessionId: "mock-sess-22",
    scenario: "Silence",
    personality: "Witty",
    completedAt: daysAgo(24, 18, 0),
    scores: scores(55, 74, 63, 69),
    keyMoment: "0:12 — filled dead air with a meme reference",
    coaching:
      "Inside jokes need shared ground. Check she got it before building a bit on top.",
    turns: turns(
      { speaker: "ai", text: "…" },
      {
        speaker: "user",
        text: "This is giving ‘waiting for the Wi‑Fi’ energy.",
      },
      { speaker: "ai", text: "I… don’t think I got that." },
      {
        speaker: "user",
        text: "Fair. Bad meme. How’s the quiet treating you instead?",
      },
      {
        speaker: "ai",
        text: "Better when you stop forcing the bit.",
      }
    ),
  },
  {
    id: "mock-23",
    sessionId: "mock-sess-23",
    scenario: "Coffee Chat",
    personality: "Guarded",
    completedAt: daysAgo(26, 15, 22),
    scores: scores(61, 58, 77, 64),
    keyMoment: "0:44 — respected her ‘I don’t talk about that’",
    coaching:
      "Boundary read was clean. Offer a lighter lane instead of going mute after.",
    turns: turns(
      {
        speaker: "ai",
        text: "I don’t talk about that.",
      },
      {
        speaker: "user",
        text: "Got it. We can leave it there.",
      },
      { speaker: "ai", text: "Thanks." },
      {
        speaker: "user",
        text: "Want a lighter lane — best thing you ate this week?",
      },
      {
        speaker: "ai",
        text: "Spicy noodles that ruined me. Worth it.",
      }
    ),
  },
  {
    id: "mock-24",
    sessionId: "mock-sess-24",
    scenario: "First Date",
    personality: "Warm",
    completedAt: daysAgo(28, 19, 55),
    scores: scores(79, 81, 76, 87),
    keyMoment: "1:26 — closed by naming one thing you’ll remember",
    coaching:
      "Strong close. Next time invite her memory too — reciprocity seals the night.",
    turns: turns(
      {
        speaker: "ai",
        text: "I should head out soon — early morning.",
      },
      {
        speaker: "user",
        text: "Same. Before you go — I’ll remember how easy it was to tell you about the quiet weekends.",
      },
      {
        speaker: "ai",
        text: "That’s a lovely thing to leave with.",
      },
      {
        speaker: "user",
        text: "What will you remember?",
      },
      {
        speaker: "ai",
        text: "That you asked. Most people don’t.",
      }
    ),
  },
];

/** Merge persisted sessions with demo mocks (real entries always win). */
export function withMockHistory(persisted: HistoryEntry[]): HistoryEntry[] {
  const real = persisted.filter((e) => !e.id.startsWith("mock-"));
  const realSessionIds = new Set(
    real.map((e) => e.sessionId).filter((id): id is string => Boolean(id))
  );
  const mocks = MOCK_HISTORY.filter(
    (m) => !m.sessionId || !realSessionIds.has(m.sessionId)
  );
  return [...real, ...mocks];
}

export function isMockSessionId(sessionId?: string | null): boolean {
  if (!sessionId) return false;
  return (
    sessionId.startsWith("mock-") ||
    sessionId.startsWith("mock_") ||
    sessionId.startsWith("local-")
  );
}
