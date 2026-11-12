import { db } from "@/db";
import { loginAttempts } from "@/db/auth-schema";
import { eq, and, or } from "drizzle-orm";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 menit dalam milidetik

export interface LoginStatusResult {
  isLocked: boolean;
  remainingAttempts: number;
  remainingSeconds: number;
  totalAttempts: number;
}

/**
 * Cek status percobaan login untuk username/email tertentu.
 */
export async function checkLoginStatus(
  identifier: string,
  ipAddress?: string | null
): Promise<LoginStatusResult> {
  const cleanId = identifier.trim().toLowerCase();
  const now = Date.now();

  const [record] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.identifier, cleanId))
    .limit(1);

  if (!record) {
    return {
      isLocked: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
      remainingSeconds: 0,
      totalAttempts: 0,
    };
  }

  // Jika sedang terkunci
  if (record.lockedUntil) {
    const lockedUntilMs =
      record.lockedUntil instanceof Date
        ? record.lockedUntil.getTime()
        : Number(record.lockedUntil);

    if (lockedUntilMs > now) {
      const remainingSeconds = Math.ceil((lockedUntilMs - now) / 1000);
      return {
        isLocked: true,
        remainingAttempts: 0,
        remainingSeconds,
        totalAttempts: record.attemptCount,
      };
    } else {
      // Masa kunci sudah lewat, reset otomatis
      await db
        .delete(loginAttempts)
        .where(eq(loginAttempts.identifier, cleanId));

      return {
        isLocked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
        remainingSeconds: 0,
        totalAttempts: 0,
      };
    }
  }

  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - record.attemptCount);
  return {
    isLocked: false,
    remainingAttempts,
    remainingSeconds: 0,
    totalAttempts: record.attemptCount,
  };
}

/**
 * Catat percobaan login yang gagal.
 */
export async function recordFailedAttempt(
  identifier: string,
  ipAddress?: string | null
): Promise<LoginStatusResult> {
  const cleanId = identifier.trim().toLowerCase();
  const now = new Date();
  const nowMs = now.getTime();

  const [existing] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.identifier, cleanId))
    .limit(1);

  let newCount = 1;
  let lockedUntil: Date | null = null;

  if (existing) {
    // Jika sebelumnya pernah terkunci dan masa kunci sudah berakhir
    if (existing.lockedUntil) {
      const lockedUntilMs =
        existing.lockedUntil instanceof Date
          ? existing.lockedUntil.getTime()
          : Number(existing.lockedUntil);

      if (lockedUntilMs <= nowMs) {
        newCount = 1;
      } else {
        // Masih dalam masa kunci
        return {
          isLocked: true,
          remainingAttempts: 0,
          remainingSeconds: Math.ceil((lockedUntilMs - nowMs) / 1000),
          totalAttempts: existing.attemptCount,
        };
      }
    } else {
      newCount = existing.attemptCount + 1;
    }

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(nowMs + LOCKOUT_DURATION_MS);
    }

    await db
      .update(loginAttempts)
      .set({
        attemptCount: newCount,
        lastAttemptAt: now,
        lockedUntil,
        ipAddress: ipAddress || existing.ipAddress,
      })
      .where(eq(loginAttempts.identifier, cleanId));
  } else {
    if (newCount >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(nowMs + LOCKOUT_DURATION_MS);
    }

    await db.insert(loginAttempts).values({
      identifier: cleanId,
      ipAddress: ipAddress || null,
      attemptCount: newCount,
      lastAttemptAt: now,
      lockedUntil,
    });
  }

  const isLocked = newCount >= MAX_FAILED_ATTEMPTS;
  const remainingSeconds = isLocked ? Math.ceil(LOCKOUT_DURATION_MS / 1000) : 0;
  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - newCount);

  return {
    isLocked,
    remainingAttempts,
    remainingSeconds,
    totalAttempts: newCount,
  };
}

/**
 * Reset catatan percobaan setelah login sukses.
 */
export async function resetLoginAttempts(identifier: string): Promise<void> {
  const cleanId = identifier.trim().toLowerCase();
  await db
    .delete(loginAttempts)
    .where(eq(loginAttempts.identifier, cleanId));
}

