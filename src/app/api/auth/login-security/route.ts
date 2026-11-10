import { NextRequest, NextResponse } from "next/server";
import {
  checkLoginStatus,
  recordFailedAttempt,
  resetLoginAttempts,
} from "@/lib/rate-limiter";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get("identifier");

  if (!identifier) {
    return NextResponse.json(
      { error: "Parameter identifier wajib diisi" },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const status = await checkLoginStatus(identifier, ip);

  return NextResponse.json(status);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { error: "Identifier wajib disertakan" },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);

    if (action === "failed") {
      const result = await recordFailedAttempt(identifier, ip);
      return NextResponse.json(result);
    }

    if (action === "reset") {
      await resetLoginAttempts(identifier);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Aksi tidak dikenali. Gunakan 'failed' atau 'reset'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in login-security route:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server keamanan" },
      { status: 500 }
    );
  }
}

