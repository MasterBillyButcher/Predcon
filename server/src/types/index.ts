export type PredictionStatus =
  | "DRAFT"
  | "ACTIVE"
  | "LOCKED"
  | "RESOLVING"
  | "RESOLVED"
  | "CANCELLED"
  | "EXPIRED";

export type OutcomeColor = "blue" | "pink" | "teal" | "amber";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
}

export interface ApiError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface AuthedUser {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string | null;
  isDemo: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}
