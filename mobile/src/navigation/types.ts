import type { CoachResponse } from "../services/sessionHelpers";

export type LiveDateParams = {
  sessionId?: string;
  scenario?: string;
};

export type ResultsParams = Partial<CoachResponse> & {
  sessionId?: string;
  error?: string;
};

export type RootStackParamList = {
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
