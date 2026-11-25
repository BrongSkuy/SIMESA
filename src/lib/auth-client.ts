import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Koordinasi proses logout lintas komponen agar DashboardShell tidak memicu
// router.push("/login") ganda yang memutus RSC stream saat signOut sedang berjalan.
let signingOutFlag = false;

export function setSigningOut(value: boolean) {
  signingOutFlag = value;
}

export function isSigningOut(): boolean {
  return signingOutFlag;
}
