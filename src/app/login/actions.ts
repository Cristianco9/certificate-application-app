"use server";

import { cookies } from "next/headers";

import { LANDING_BY_ROLE } from "@/permissions/roles";
import type { BackendRole } from "@/permissions/roles";
import type { MeResponse } from "@/types/auth";

const API_URL = process.env.API_URL ?? "";
const API_KEY = process.env.API_KEY ?? "";
const COOKIE_NAME = process.env.COOKIE_NAME ?? "authentication";

const MESSAGES = {
  invalidCredentials: "Los datos ingresados no son válidos",
  systemError:
    "El sistema está experimentando problemas. Por favor, inténtelo de nuevo más tarde.",
} as const;

export type LoginActionResult =
  | { success: true; message: string; redirectTo: string }
  | { success: false; message: string };

export async function loginAction(
  username: string,
  password: string
): Promise<LoginActionResult> {
  if (!API_URL || !API_KEY) {
    return { success: false, message: MESSAGES.systemError };
  }

  try {
    const apiResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify({ credentials: { username, password } }),
      cache: "no-store",
    });

    // 401 → invalid credentials. The backend deliberately returns the same
    // shape for "user not found" and "wrong password".
    if (apiResponse.status === 400 || apiResponse.status === 401) {
      return { success: false, message: MESSAGES.invalidCredentials };
    }

    // Anything else non-2xx → treat as a system problem.
    if (!apiResponse.ok) {
      return { success: false, message: MESSAGES.systemError };
    }

    // Forward the httpOnly `authentication` cookie issued by the API.
    const setCookieHeaders =
      typeof apiResponse.headers.getSetCookie === "function"
        ? apiResponse.headers.getSetCookie()
        : [];

    if (setCookieHeaders.length > 0) {
      const cookieStore = await cookies();
      for (const raw of setCookieHeaders) {
        forwardSetCookie(cookieStore, raw);
      }
    }

    // Resolve the role so the caller knows where to land. The login
    // response does not carry the role — the JWT is httpOnly and the
    // backend returns only `{ success, message }`. We call /auth/me
    // ourselves, passing the freshly-issued cookie explicitly (the Server
    // Action's `cookies()` jar is response-only and does not feed the
    // request store).
    const redirectTo = await resolveLandingPath(setCookieHeaders);

    return {
      success: true,
      message: "Sesión iniciada correctamente",
      redirectTo: redirectTo ?? "/dashboard",
    };
  } catch {
    return { success: false, message: MESSAGES.systemError };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

type CookieJar = Awaited<ReturnType<typeof cookies>>;

/**
 * Reads the role from `GET /auth/me` using the token that was just issued
 * and returns the corresponding landing path.
 *
 * Returns `null` on any failure — misconfiguration, network error, an
 * unexpected payload — so the caller can fall back to `/dashboard` and let
 * the layout guard sort out the destination. Failing to log the user in
 * because we couldn't guess their landing page would be worse than landing
 * on the wrong page.
 */
async function resolveLandingPath(
  setCookieHeaders: string[]
): Promise<string | null> {
  const token = extractCookieValue(setCookieHeaders, COOKIE_NAME);
  if (!token) return null;

  try {
    const meRes = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: API_KEY,
        Cookie: `${COOKIE_NAME}=${token}`,
      },
      cache: "no-store",
    });

    if (!meRes.ok) return null;

    const me = (await meRes.json()) as MeResponse;
    if (!me.success) return null;

    return LANDING_BY_ROLE[me.role as BackendRole] ?? "/dashboard";
  } catch {
    return null;
  }
}

/**
 * Finds `<name>=<value>` in a `Set-Cookie` header list and returns the
 * value with all attributes stripped.
 */
function extractCookieValue(
  setCookieHeaders: string[],
  name: string
): string | null {
  const prefix = `${name}=`;
  const header = setCookieHeaders.find((raw) =>
    raw.trim().toLowerCase().startsWith(prefix.toLowerCase())
  );
  if (!header) return null;

  const value = header
    .slice(header.indexOf("=") + 1)
    .split(";")[0]
    .trim();

  return value || null;
}

function forwardSetCookie(jar: CookieJar, raw: string): void {
  const [pair, ...attributes] = raw.split(";").map((part) => part.trim());
  const separatorIndex = pair.indexOf("=");
  if (separatorIndex === -1) return;

  const name = pair.slice(0, separatorIndex).trim();
  const value = pair.slice(separatorIndex + 1).trim();

  const options: Parameters<CookieJar["set"]>[2] = { path: "/" };

  for (const attribute of attributes) {
    const [key, ...valueParts] = attribute.split("=");
    const attrKey = key.trim().toLowerCase();
    const attrValue = valueParts.join("=").trim();

    if (attrKey === "path") options.path = attrValue || "/";
    if (attrKey === "httponly") options.httpOnly = true;
    if (attrKey === "secure") options.secure = true;
    if (attrKey === "samesite") {
      const v = attrValue.toLowerCase();
      if (v === "lax" || v === "strict" || v === "none") options.sameSite = v;
    }
    if (attrKey === "max-age") {
      const n = Number(attrValue);
      if (!Number.isNaN(n)) options.maxAge = n;
    }
    if (attrKey === "expires") {
      const d = new Date(attrValue);
      if (!Number.isNaN(d.getTime())) options.expires = d;
    }
  }

  options.httpOnly = true;
  jar.set(name, value, options);
}
