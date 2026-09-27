"use client";

import {
  getToken,
  getTokenPayload,
  isTokenExpired,
  removeToken,
} from "@/lib/auth/token";

import type { AuthenticatedUser } from "@/types/auth";

export type SessionState =
  | {
      status: "authenticated";
      user: AuthenticatedUser;
      expiresAt: number;
    }
  | {
      status: "unauthenticated";
      reason:
        | "AUTHENTICATION_REQUIRED"
        | "TOKEN_EXPIRED"
        | "INVALID_TOKEN";
    };

/**
 * Returns the current authentication state based on
 * the JWT stored in the browser.
 *
 * Important:
 * This function is only a frontend session helper.
 * The backend remains responsible for authentication
 * and authorization.
 */
export function getSessionState(): SessionState {
  const token = getToken();

  /**
   * No token means the user is not authenticated.
   */
  if (!token) {
    return {
      status: "unauthenticated",
      reason: "AUTHENTICATION_REQUIRED",
    };
  }

  /**
   * Check whether the JWT has expired.
   */
  if (isTokenExpired(token)) {
    removeToken();

    return {
      status: "unauthenticated",
      reason: "TOKEN_EXPIRED",
    };
  }

  /**
   * Decode the JWT payload.
   */
  const payload = getTokenPayload();

  /**
   * If the JWT cannot be decoded, consider
   * the frontend session invalid.
   */
  if (!payload) {
    removeToken();

    return {
      status: "unauthenticated",
      reason: "INVALID_TOKEN",
    };
  }

  /**
   * Build the authenticated user from the JWT.
   */
  return {
    status: "authenticated",

    user: {
      id: payload.id,
      role: payload.role,
    },

    expiresAt: payload.exp * 1000,
  };
}
