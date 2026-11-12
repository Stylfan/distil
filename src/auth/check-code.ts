import type { Db } from "@/db/client";
import type { User } from "@/db/schema";
import { claimTotpStep, spendRecoveryCode } from "@/services/factors";
import { open } from "./secret-box";
import { verifyTotp } from "./totp";

/**
 * Checks a code from the authenticator app, or a recovery code, for a user
 * with two-step sign-in on. A TOTP code is claimed atomically, so it works
 * once; a recovery code is spent.
 */
export async function checkSecondFactor(db: Db, user: User, code: string): Promise<boolean> {
  if (!user.totpSecret) return false;
  const digits = code.replace(/\s/g, "");
  if (/^\d{6}$/.test(digits)) {
    const step = verifyTotp(open(user.totpSecret), digits, user.totpLastStep);
    return step !== null && (await claimTotpStep(db, user.id, step));
  }
  return spendRecoveryCode(db, user.id, code);
}
