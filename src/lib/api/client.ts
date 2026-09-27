import { getToken, setToken, removeToken } from "@/lib/auth/token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

type RequestOptions = RequestInit & {
  /**
   * When `true` (default), the stored JWT is attached as a
   * `Bearer` token, and any rotated token returned by the API is
   * persisted to `localStorage`.
   *
   * Set to `false` for public endpoints (login, reset-password)
   * that do not require — or return — a session token. Their
   * responses are handled explicitly by the caller (the login
   * Server Action, for example) rather than auto-persisted here.
   */
  authenticated?: boolean;
};

export async function apiClient(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { authenticated = true, headers, ...fetchOptions } = options;

  const requestHeaders = new Headers(headers);

  requestHeaders.set("Accept", "application/json");

  /*
   * Only default the Content-Type to JSON when the caller did not
   * supply a body whose shape dictates otherwise.
   *
   * FormData (used by the historical-import upload) must NOT be
   * forced to application/json — the browser has to set the
   * multipart boundary itself, and overriding it breaks the
   * upload at the server.
   */
  const isFormData =
    typeof FormData !== "undefined" &&
    fetchOptions.body instanceof FormData;

  if (!isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (API_KEY) {
    requestHeaders.set("apikey", API_KEY);
  }

  if (authenticated) {
    const token = getToken();

    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers: requestHeaders,
  });

  /*
   * ── Token rotation ──────────────────────────────────────────
   *
   * The backend rotates the JWT on every authenticated request
   * and returns the replacement in the response body under the
   * `authentication` key (see `AuthenticatedApiResponse` in
   * `@/types/api`).
   *
   * Only rotate on a successful response — a failed request must
   * not mint a new session.
   */
  if (authenticated && response.ok) {
    const rotatedToken = await readRotatedToken(response);

    if (rotatedToken) {
      setToken(rotatedToken);
    }
  }

  /*
   * The API rejected the session (missing, expired, or revoked).
   * Clear the local token so the next navigation sends the user
   * back through the login flow rather than retrying with a
   * known-bad credential.
   */
  if (response.status === 401) {
    removeToken();
  }

  return response;
}

/**
 * Best-effort extraction of the rotated JWT from a successful
 * API response.
 *
 * Returns `null` — never throws — when the response has no body,
 * is not JSON, or does not carry an `authentication` field. This
 * keeps binary downloads (`reprintCertificate`), 204 responses,
 * and non-JSON error bodies safe to pass through the client
 * without special-casing them at every call site.
 */
async function readRotatedToken(
  response: Response
): Promise<string | null> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  try {
    /*
     * `Response.body` can only be consumed once, and the caller
     * still needs the original. Clone it so parsing here does not
     * starve the consumer downstream.
     */
    const cloned = response.clone();
    const payload = (await cloned.json()) as unknown;

    if (
      payload !== null &&
      typeof payload === "object" &&
      "authentication" in payload &&
      typeof (payload as { authentication: unknown }).authentication ===
        "string"
    ) {
      return (payload as { authentication: string }).authentication;
    }

    return null;
  } catch {
    return null;
  }
}
