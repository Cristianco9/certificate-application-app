"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  getTokenPayload,
  removeToken,
} from "@/lib/auth/token";

/**
 * Watches the stored JWT and routes the user to /unauthorized the
 * moment it expires.
 *
 * Design notes:
 *
 * - Runs once per mount (and again only if `router` changes identity,
 *   which it does not in practice). The pending `setTimeout` is
 *   tracked locally and cleared on cleanup, so it can never fire
 *   after the component unmounts.
 *
 * - Two distinct exit conditions:
 *     1. Token expires while the user is on the page → TOKEN_EXPIRED.
 *     2. Token disappears entirely (logout in another tab, storage
 *        cleared) → AUTHENTICATION_REQUIRED.
 *
 * - No token when the hook first runs is NOT an error — it usually
 *   means the user is not authenticated yet, and RoleGuard will
 *   handle the redirect. The hook stays silent in that case and
 *   waits for a token to appear.
 */
export function useAuthExpiration() {
  const router = useRouter();

  useEffect(() => {
    let timeoutId: number | undefined;
    let cancelled = false;

    const checkExpiration = () => {
      if (cancelled) return;

      const payload = getTokenPayload();

      if (!payload) {
        // The hook mounted without a token, or the token was removed
        // while we were waiting (logout in another tab, storage
        // cleared). If we previously scheduled a timer for a token
        // that has since disappeared, we no longer know whether the
        // user *should* be here — leave that decision to RoleGuard
        // by simply stopping.
        //
        // We deliberately do NOT redirect from here on a null token:
        // this hook is typically mounted *inside* a protected route
        // and racing RoleGuard's own redirect produces a double
        // navigation. RoleGuard owns the "no session" case.
        return;
      }

      const expirationTime = payload.exp * 1000;
      const remainingTime = expirationTime - Date.now();

      if (remainingTime <= 0) {
        removeToken();
        router.replace("/unauthorized?reason=TOKEN_EXPIRED");
        return;
      }

      // Schedule the next check for exactly when the token expires.
      // `window.setTimeout` is used (not the global one) so the ID is
      // a number in the browser, which is what `clearTimeout` expects.
      timeoutId = window.setTimeout(checkExpiration, remainingTime);
    };

    checkExpiration();

    return () => {
      cancelled = true;

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [router]);
}
