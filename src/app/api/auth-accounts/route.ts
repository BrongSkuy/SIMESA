import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/auth-accounts — list all registered accounts
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user as Record<string, unknown>).appRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db.select().from(user).all();
  const mapped = result.map((u) => ({
    ...u,
    isCurrentUser: u.id === session.user.id,
  }));
  return NextResponse.json(mapped);
}
