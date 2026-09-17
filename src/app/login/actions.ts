"use server";

import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "";
const API_KEY = process.env.API_KEY ?? "";

const MESSAGES = {
  invalidCredentials: "Los datos ingresados no son válidos",
  systemError:
    "El sistema está experimentando problemas. Por favor, inténtelo de nuevo más tarde.",
} as const;

export type LoginActionResult = {
  success: boolean;
  message: string;
};

export async function loginAction(
  username: string,
  password: string
): Promise<LoginActionResult> {
  if (!API_URL || !API_KEY) {
    return { success: false, message: MESSAGES.systemError };
  }

  try {
    const apiResponse = await fetch(`${API_URL}/users/login`, {
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
    // shape for "user not found" and "wrong password" (see types/auth.ts).
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

    return { success: true, message: "Sesión iniciada correctamente" };
  } catch {
    return { success: false, message: MESSAGES.systemError };
  }
}

type CookieJar = Awaited<ReturnType<typeof cookies>>;

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
