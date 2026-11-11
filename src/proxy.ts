import { NextRequest, NextResponse } from "next/server";
import { getPortalForRole } from "@/lib/rbac";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes and API routes
  if (
    pathname === "/login" ||
    pathname === "/" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (Better Auth uses 'better-auth.session_token' locally and '__Secure-better-auth.session_token' in production HTTPS)
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) {
    // No session → redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Validate session by calling Better Auth's getSession endpoint
  try {
    const sessionRes = await fetch(
      `${request.nextUrl.origin}/api/auth/get-session`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!sessionRes.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const session = await sessionRes.json();
    const appRole = (session?.user as Record<string, unknown>)?.appRole as
      | string
      | undefined;
    const userPortal = getPortalForRole(appRole || "SISWA");

    // RBAC: check if user has access to the requested route based on their assigned portal
    if (pathname.startsWith("/admin") && userPortal !== "/admin") {
      return NextResponse.redirect(new URL(userPortal, request.url));
    }

    if (pathname.startsWith("/guru") && userPortal !== "/guru") {
      return NextResponse.redirect(new URL(userPortal, request.url));
    }

    if (pathname.startsWith("/siswa") && userPortal !== "/siswa") {
      return NextResponse.redirect(new URL(userPortal, request.url));
    }

    return NextResponse.next();
  } catch {
    // If session validation fails, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    // Match all paths except static files and api
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
