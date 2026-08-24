import { NextResponse } from "next/server";
export function apiError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unexpected server error";
  if (message === "UNAUTHORIZED")
    return NextResponse.json(
      { error: "Your session expired. Please sign in again." },
      { status: 401 },
    );
  if (message === "FORBIDDEN")
    return NextResponse.json(
      { error: "This request was blocked for security reasons." },
      { status: 403 },
    );
  console.error(error);
  return NextResponse.json({ error: message }, { status: 500 });
}
