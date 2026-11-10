import { checkLoginStatus, recordFailedAttempt, resetLoginAttempts } from "../src/lib/rate-limiter";
import { getUserFullRoles } from "../src/lib/rbac";
import { db } from "../src/db";
import { user } from "../src/db/auth-schema";
import { eq } from "drizzle-orm";

async function runTests() {
  console.log("🧪 Testing RBAC & Rate Limiting Security...\n");

  const testId = "test_user_rate_limit";

  // 1. Initial status
  await resetLoginAttempts(testId);
  let status = await checkLoginStatus(testId);
  console.log("1. Initial Status:", status);
  if (status.isLocked || status.remainingAttempts !== 5) {
    throw new Error("Initial status should have 5 remaining attempts and not locked");
  }

  // 2. Simulate 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    status = await recordFailedAttempt(testId);
    console.log(`2.${i} Failed Attempt ${i}: remaining = ${status.remainingAttempts}, locked = ${status.isLocked}`);
    if (status.isLocked || status.remainingAttempts !== 5 - i) {
      throw new Error(`Attempt ${i} failed status check`);
    }
  }

  // 3. 5th failed attempt -> should lock for 5 minutes (300s)
  status = await recordFailedAttempt(testId);
  console.log("3. 5th Failed Attempt (Lockout):", status);
  if (!status.isLocked || status.remainingAttempts !== 0 || status.remainingSeconds <= 0) {
    throw new Error("5th attempt should lock the account");
  }

  // 4. Verify checkLoginStatus also reports locked
  const lockCheck = await checkLoginStatus(testId);
  console.log("4. Check Lockout Status:", lockCheck);
  if (!lockCheck.isLocked || lockCheck.remainingSeconds <= 0) {
    throw new Error("checkLoginStatus should return isLocked = true");
  }

  // 5. Reset attempts on success
  await resetLoginAttempts(testId);
  const resetCheck = await checkLoginStatus(testId);
  console.log("5. Post-Reset Status:", resetCheck);
  if (resetCheck.isLocked || resetCheck.remainingAttempts !== 5) {
    throw new Error("Post-reset should restore 5 remaining attempts");
  }

  // 6. Test Multi-Role fetching
  console.log("\n👥 Testing Multi-Role Retrieval for Teacher with BK & Wali...");
  const [sitiUser] = await db.select().from(user).where(eq(user.username, "198203152008"));
  if (sitiUser) {
    const rolesData = await getUserFullRoles(sitiUser.id);
    console.log("Siti Rahayu Roles:", rolesData);
    if (!rolesData.allRoles.includes("GURU") || !rolesData.allRoles.includes("GURU_BK") || !rolesData.allRoles.includes("WALI_KELAS")) {
      throw new Error("Siti Rahayu should have GURU, GURU_BK, and WALI_KELAS");
    }
  }

  console.log("\n🎉 All RBAC and Rate Limiting Security Tests Passed!\n");
}

runTests().catch((e) => {
  console.error("❌ Test failed:", e);
  process.exit(1);
});
