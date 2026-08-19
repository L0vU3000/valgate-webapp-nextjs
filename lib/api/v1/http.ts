import "server-only";
import { NextResponse } from "next/server";

// The stable, single error envelope for every HTTP API v1 route. Never wraps a caught
// error's message — callers pass a fixed, generic string per status/code (see auth.ts).
export type ApiErrorCode =
  | "unauthorized"
  | "invalid_request"
  | "not_found"
  | "rate_limited"
  | "internal_error";

export function apiError(status: number, code: ApiErrorCode, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}
