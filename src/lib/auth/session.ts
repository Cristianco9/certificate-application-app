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
 * Why the session could not be established. Mirrors the `error` codes the
 * backend returns from `GET /auth/me`, plus two client-side causes we need
 * to distinguish for user-facing copy.
 */
export type SessionFailureReason =
  | "AUTHENTICATION_REQUIRED"
  | "TOKEN_EXPIRED"
  | "INVALID_TOKEN"
  | "NETWORK_ERROR"
  | "MISCONFIGURED";

export type SessionState =
  | { status: "authenticated"; user: AuthenticatedUser }
  | { status: "unauthenticated"; reason: SessionFailureReason };

/**
 * Full session state, including the *reason* for failure. Use this in
 * user-facing screens (e.g. /unauthorized) that need to explain what
 * happened. Use `getSession()` / `requireUser()` in guards, where only
 * "is there a valid session" matters.
 */
export async function getSessionState(): Promise<SessionState> {
  if (!API_URL || !API_KEY || !COOKIE_NAME) {
    return { status: "unauthenticated", reason: "MISCONFIGURED" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return { status: "unauthenticated", reason: "AUTHENTICATION_REQUIRED" };
  }

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

    // The backend signals auth failures via `success: false` + an error code,
    // which is the authoritative signal — regardless of the HTTP status it
    // chose to pair it with. Parse first, decide second.
    let body: MeResponse | null = null;
    try {
      body = (await res.json()) as MeResponse;
    } catch {
      // Body isn't JSON → can't be a Me response. Fall through.
    }

    if (body && body.success === false) {
      return { status: "unauthenticated", reason: body.error };
    }

    if (!res.ok) {
      return { status: "unauthenticated", reason: "NETWORK_ERROR" };
    }

    if (!body || body.success !== true) {
      return { status: "unauthenticated", reason: "INVALID_TOKEN" };
    }

    return {
      status: "authenticated",
      user: { id: body.id, role: body.role },
    };
  } catch {
    return { status: "unauthenticated", reason: "NETWORK_ERROR" };
  }
}

/** Thin wrapper kept for existing callers. */
export async function getSession(): Promise<AuthenticatedUser | null> {
  const state = await getSessionState();
  return state.status === "authenticated" ? state.user : null;
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const state = await getSessionState();

  if (state.status === "authenticated") {
    return state.user;
  }

  // No cookie at all → the visitor isn't signed in. This is a normal,
  // unremarkable state: send them straight to login. There is no failed
  // action to explain, and /unauthorized would just add a click.
  if (state.reason === "AUTHENTICATION_REQUIRED") {
    redirect("/login");
  }

  // A cookie *was* presented but the API rejected it — expired, revoked,
  // or malformed. The user believed they had a session; that belief was
  // wrong. Explain what happened on /unauthorized rather than silently
  // bouncing them to /login as if nothing occurred.
  redirect("/unauthorized");
}

export async function requireRole(
  allowed: readonly UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!hasRole(user, allowed)) redirect("/unauthorized");
  return user;
}
