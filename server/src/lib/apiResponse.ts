import type { Response } from "express";
import type { ApiError, ApiSuccess } from "../types/index.js";

export function ok<T>(res: Response, data: T, status = 200): Response<ApiSuccess<T>> {
  return res.status(status).json({ success: true, data, error: null });
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
): Response<ApiError> {
  return res.status(status).json({ success: false, data: null, error: { code, message } });
}

export class ApiException extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
