"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthExpiration } from "@/hooks/useAuthExpiration";

import type { BackendRole } from "@/permissions/roles";

// Module-level so RoleGuard's effect doesn't re-run on every render.
const ALLOWED_ROLES = [
  "Máster",
  "Administrador",
  "Funcionario",
  "Rector",
] as const satisfies readonly BackendRole[];

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  useAuthExpiration();

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
