// src/lib/auth/session.ts
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasRole } from "@/permissions/authorization";
import type {
  AuthenticatedUser,
  MeResponse,
  UserRole,
} from "@/types/auth";

const API_URL = process.env.API_URL ?? "";
const API_KEY = process.env.API_KEY ?? "";
const COOKIE_NAME = process.env.COOKIE_NAME ?? "";

/**
 * Reads the httpOnly `authentication` cookie and asks the backend to
 * validate it. Returns `null` for every failure mode — missing cookie,
 * misconfiguration, network error, expired/invalid token — because the
 * caller's only job is "is there a valid session or not?".
 */
export async function getSession(): Promise<AuthenticatedUser | null> {
  if (!API_URL || !API_KEY) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: API_KEY,
        Cookie: `${COOKIE_NAME}=${token}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as MeResponse;
    if (!data.success) return null;

    return { id: data.id, role: data.role };
  } catch {
    // Network failure → treat as unauthenticated. The next request will
    // retry, and the user is bounced to /login either way.
    return null;
  }
}

/**
 * Guard for "any authenticated user". Redirects to /login otherwise.
 * Call at the top of a layout/page; the return value is the verified user.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/**
 * Guard for "authenticated AND has one of the allowed roles".
 * `redirect()` must stay outside the try/catch above — it throws a control-
 * flow error that a catch block would swallow.
 */
export async function requireRole(
  allowed: readonly UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!hasRole(user, allowed)) redirect("/unauthorized");
  return user;
}
