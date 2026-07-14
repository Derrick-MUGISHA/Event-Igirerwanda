import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export const unauthorized = () => fail("Unauthorized", 401);
export const forbidden = () => fail("Forbidden", 403);
export const notFound = (what = "Resource") => fail(`${what} not found`, 404);
