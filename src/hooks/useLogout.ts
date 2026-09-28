"use client";

import { useRouter } from "next/navigation";

import { removeToken } from "@/lib/auth/token";

/**
 * Ends the frontend session.
 *
 * - Deletes the JWT from localStorage.
 * - Uses `replace` so the back button doesn't return to a protected page.
 *   If it does, RoleGuard finds no token and routes to /unauthorized.
 *
 * TODO: when the QueryClientProvider is added, also call
 * `queryClient.clear()` here so cached server data from the previous
 * user is never shown to the next one.
 */
export function useLogout() {
  const router = useRouter();

  return function logout() {
    removeToken();
    router.replace("/login");
  };
}
