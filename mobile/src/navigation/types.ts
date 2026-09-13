import type { CoachResponse } from "../services/sessionHelpers";

export type LiveDateParams = {
  sessionId?: string;
  scenario?: string;
};

export type ResultsParams = Partial<CoachResponse> & {
  sessionId?: string;
  error?: string;
  /** Live transcript to upload/coach when navigating before the API finishes. */
  pendingTurns?: { speaker: "user" | "ai"; text: string }[];
};

export type RootStackParamList = {
  SignUp: undefined;
  Onboarding: undefined;
  Main: undefined;
  LiveDate: LiveDateParams | undefined;
  Results: ResultsParams | undefined;
};

export type MainTabParamList = {
  Practice: undefined;
  History: undefined;
  Profile: undefined;
};
