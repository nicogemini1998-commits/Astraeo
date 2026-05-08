import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unexpected error";
}

export function ok<T>(
  data: T,
  meta?: ApiSuccess<T>["meta"],
  status = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

export function err(
  message: string,
  status = 500,
  code?: string,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: message, ...(code ? { code } : {}), ...(details ? { details } : {}) },
    { status }
  );
}

export function validationError(zodErr: ZodError): NextResponse<ApiError> {
  return err("Validation failed", 422, "VALIDATION_ERROR", zodErr.flatten().fieldErrors);
}

export function notFound(resource = "Resource"): NextResponse<ApiError> {
  return err(`${resource} not found`, 404, "NOT_FOUND");
}

export function unauthorized(): NextResponse<ApiError> {
  return err("Unauthorized", 401, "UNAUTHORIZED");
}

export function forbidden(): NextResponse<ApiError> {
  return err("Forbidden", 403, "FORBIDDEN");
}

export function rateLimited(): NextResponse<ApiError> {
  return err("Too many requests — slow down", 429, "RATE_LIMITED");
}

export function handleRouteError(error: unknown): NextResponse<ApiError> {
  if (error instanceof ZodError) return validationError(error);
  const msg = errorMessage(error);
  if (process.env.NODE_ENV !== "production") {
    console.error("[route error]", error);
  }
  return err(msg, 500, "INTERNAL_ERROR");
}
