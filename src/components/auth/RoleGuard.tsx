"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getSessionState } from "@/lib/auth/session";
import { hasRole } from "@/permissions/authorization";

import type { BackendRole } from "@/permissions/roles";

type RoleGuardProps = {
  allowedRoles: readonly BackendRole[];
  children: React.ReactNode;
};

/**
 * Client-side route authorization guard.
 *
 * This guard controls frontend navigation and UI visibility. It is NOT
 * the security boundary — the backend independently verifies the JWT
 * signature, expiry, and role on every request.
 *
 * On failure, the user is routed to /unauthorized with a `reason` query
 * param rather than straight to /login, so they see *why* their session
 * ended instead of a bare login form with no context.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = getSessionState();

    if (session.status === "unauthenticated") {
      // Pass the specific reason (AUTHENTICATION_REQUIRED, TOKEN_EXPIRED,
      // INVALID_TOKEN) so /unauthorized can render the matching copy.
      router.replace(`/unauthorized?reason=${session.reason}`);
      return;
    }

    if (!hasRole(session.user, allowedRoles)) {
      // Authenticated but the role isn't in the allow list. /unauthorized
      // reads the live session to render the role-specific denial copy.
      router.replace("/unauthorized?reason=FORBIDDEN");
      return;
    }

    setAuthorized(true);
  }, [allowedRoles, router]);

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
