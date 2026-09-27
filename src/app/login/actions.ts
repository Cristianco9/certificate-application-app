"use server";

// `.trim()` guards against a leading/trailing space in the .env file
// (env/.envExample currently has `API_URL= http://...`), which some
// dotenv versions preserve and which makes `fetch` fail with an
// unparseable URL.
const API_URL = process.env.API_URL?.trim() ?? "";
const API_KEY = process.env.API_KEY?.trim() ?? "";

const MESSAGES = {
  invalidCredentials: "Los datos ingresados no son válidos",
  inactiveAccount: "Esta cuenta está inactiva. Contacte al administrador.",
  systemError:
    "El sistema está experimentando problemas. Por favor, inténtelo de nuevo más tarde.",
} as const;

export type LoginActionResult =
  | { success: true; token: string; redirectTo: string }
  | { success: false; message: string };

/**
 * Body shape returned by the backend's login controller.
 *
 * Success (200):  { success: true, message, authentication: "<jwt>" }
 * Wrong creds (401): { success: false, message, error: "INVALID_CREDENTIALS" }
 * Inactive (403):    { success: false, message, error: "USER_INACTIVE" }
 *
 * Boom's error handler wraps 400 / 500 responses as:
 *   { statusCode, error, message, code? }
 */
type LoginResponseBody = {
  success?: boolean;
  message?: string;
  authentication?: unknown;
  error?: string;
  code?: string;
  statusCode?: number;
};

export async function loginAction(
  username: string,
  password: string
): Promise<LoginActionResult> {
  if (!API_URL || !API_KEY) {
    return { success: false, message: MESSAGES.systemError };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apikey: API_KEY,
      },
      body: JSON.stringify({ credentials: { username, password } }),
      cache: "no-store",
    });
  } catch {
    // Network failure, DNS failure, malformed URL, aborted request —
    // nothing to parse. This is a genuine system error.
    return { success: false, message: MESSAGES.systemError };
  }

  // ─────────────────────────────────────────────────────────────
  // TEMPORARY DIAGNOSTIC — remove once the login flow is verified.
  // Logs what the backend actually returned, since the terminal in
  // which `npm run dev` runs is the only place Server Action output
  // is visible. Do not ship this to production.
  // ─────────────────────────────────────────────────────────────
  console.log("[loginAction] response", {
    status: response.status,
    contentType: response.headers.get("content-type"),
    body: await response.clone().text(),
  });

  // Read the body once — success and every failure branch need it.
  let body: LoginResponseBody | null = null;
  try {
    body = (await response.json()) as LoginResponseBody;
  } catch {
    // Non-JSON body (proxy error page, truncated response, empty 500).
    // Leave `body` null and fall through to the status checks below.
  }

  const errorCode = body?.error;
  const boomCode = body?.code;

  // ── 200 — success ─────────────────────────────────────────────
  if (response.status === 200) {
    const token = body?.authentication;

    if (typeof token !== "string" || token.length === 0) {
      // The controller guarantees `authentication` on 200. If it's
      // missing, the contract has drifted — fail loudly rather than
      // redirecting with an undefined token.
      return { success: false, message: MESSAGES.systemError };
    }

    return { success: true, token, redirectTo: "/dashboard" };
  }

  // ── 401 — wrong username or password ──────────────────────────
  // The backend collapses "user not found" and "wrong password" into
  // this single response to prevent user enumeration.
  if (response.status === 401 || errorCode === "INVALID_CREDENTIALS") {
    return { success: false, message: MESSAGES.invalidCredentials };
  }

  // ── 403 — correct credentials, inactive account ───────────────
  if (response.status === 403 || errorCode === "USER_INACTIVE") {
    return { success: false, message: MESSAGES.inactiveAccount };
  }

  // ── 400 — malformed request ───────────────────────────────────
  // The frontend validates both fields before submitting, so a 400
  // reaching this point can never mean "the user forgot to type a
  // field" — that message would contradict what they just did.
  // Whether the cause is a stale endpoint, a body-shape mismatch,
  // or a backend that uses 400 for wrong credentials, the correct
  // UX is the same as a failed authentication.
  if (response.status === 400 || boomCode === "MISSING_CREDENTIALS") {
    return { success: false, message: MESSAGES.invalidCredentials };
  }

  // ── 404 / 500 / anything else ─────────────────────────────────
  return { success: false, message: MESSAGES.systemError };
}
