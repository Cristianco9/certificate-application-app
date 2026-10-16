import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";

import type { BackendRole } from "@/permissions/roles";

/**
 * Roles that may reach the certificate repository.
 *
 * `Auxiliar` is intentionally excluded — the repository browses issued
 * certificates, which is outside the auxiliar's scope (academic-registry
 * data entry). To grant access, add "Auxiliar" here AND add
 * `PERMISSIONS.NAV_REPOSITORY` back to the Auxiliar permission list in
 * `@/permissions/permissions.ts`.
 */
const ALLOWED_ROLES = [
  "Máster",
  "Administrador",
  "Secretario",
  "Rector",
] as const satisfies readonly BackendRole[];

export default function RepositoryLayout({
  children,
}: LayoutProps<"/repository">) {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
