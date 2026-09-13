export type PredictionStatus =
  | "DRAFT"
  | "ACTIVE"
  | "LOCKED"
  | "RESOLVING"
  | "RESOLVED"
  | "CANCELLED"
  | "EXPIRED";

export type OutcomeColor = "blue" | "pink" | "teal" | "amber";

export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

export interface User {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  isDemo: boolean;
  role: UserRole;
}

export interface Outcome {
  id: string;
  label: string;
  color: OutcomeColor;
  order: number;
  points: number;
  participants: number;
  percentage: number;
}

export interface Prediction {
  id: string;
  title: string | null;
  question: string;
  description: string | null;
  status: PredictionStatus;
  durationSecs: number;
  startedAt: string | null;
  locksAt: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  winningOutcomeId: string | null;
  minPoints: number;
  maxPoints: number | null;
  creator: Pick<User, "id" | "username" | "displayName" | "profileImageUrl"> | null;
  outcomes: Outcome[];
  totalPoints: number;
  totalParticipants: number;
  serverNow: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}
export interface ApiError {
  success: false;
  data: null;
  error: { code: string; message: string };
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
