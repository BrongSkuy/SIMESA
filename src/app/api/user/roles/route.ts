import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserFullRoles } from "@/lib/rbac-server";
import { ROLE_CONFIGS, ROLE_PERMISSIONS } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { primaryRole, additionalRoles, allRoles } = await getUserFullRoles(
    userId
  );

  const rolesInfo = allRoles.map((role) => ({
    role,
    config: ROLE_CONFIGS[role],
    permissions: ROLE_PERMISSIONS[role] || [],
  }));

  return NextResponse.json({
    primaryRole,
    additionalRoles,
    allRoles,
    rolesInfo,
  });
}

