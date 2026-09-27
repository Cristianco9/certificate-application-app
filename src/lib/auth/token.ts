"use client";

import type { JwtPayload } from "@/types/auth";

const TOKEN_KEY = "authentication";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function decodeBase64Url(value: string): string {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  return decodeURIComponent(
    atob(base64)
      .split("")
      .map(
        (character) =>
          `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`
      )
      .join("")
  );
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      decodeBase64Url(parts[1])
    ) as JwtPayload;

    return payload;
  } catch {
    return null;
  }
}

export function getTokenPayload(): JwtPayload | null {
  const token = getToken();

  if (!token) {
    return null;
  }

  return decodeToken(token);
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);

  if (!payload?.exp) {
    return true;
  }

  return Date.now() >= payload.exp * 1000;
}
