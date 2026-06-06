import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;

  return NextResponse.json(
    { message: "Public account creation is disabled for this installation." },
    { status: 403 }
  );
}
