import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getCounselingSessionById,
  updateCounselingSession,
  deleteCounselingSession,
} from "@/lib/counseling-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sessionData = await getCounselingSessionById(id);
    if (!sessionData) {
      return NextResponse.json({ error: "Data sesi konseling tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error("Error fetching counseling session:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data sesi konseling" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await updateCounselingSession(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Data sesi konseling tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating counseling session:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data sesi konseling" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteCounselingSession(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting counseling session:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data sesi konseling" },
      { status: 500 }
    );
  }
}
