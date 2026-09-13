import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiException, fail } from "../lib/apiResponse.js";

export function notFoundHandler(req: Request, res: Response) {
  fail(res, 404, "ROUTE_NOT_FOUND", `No route matches ${req.method} ${req.path}.`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ApiException) {
    return fail(res, err.status, err.code, err.message);
  }
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(" ");
    return fail(res, 422, "VALIDATION_ERROR", message || "Invalid request.");
  }
   
  console.error("Unhandled error:", err);
  return fail(res, 500, "INTERNAL_ERROR", "Something went wrong on our end.");
}

export function asyncHandler<T extends (req: Request, res: Response) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
