import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";

import type { BackendRole } from "@/permissions/roles";

/**
 * Roles that may reach the certificate-generation flow — every backend
 * role EXCEPT `Auxiliar`.
 *
 * `Auxiliar` is intentionally excluded: their job is the academic
 * registry (student / enrollment data entry), not certificate issuance.
 * The sidebar hides the corresponding nav item for them (see
 * `ROLE_PERMISSIONS` in `@/permissions/permissions.ts`), and this guard
 * is the second line of defence — it intercepts a direct URL visit to
 * `/certificates` or any nested route (e.g. `/certificates/student`).
 *
 * NOTE: this is a UX-level guard only. The backend independently
 * enforces role authorization on every request; the certificate routes
 * themselves are not yet implemented on the API (see AGENTS.md §10),
 * but when they land they must replicate this same allow-list.
 */
const ALLOWED_ROLES = [
  "Máster",
  "Administrador",
  "Funcionario",
  "Rector",
] as const satisfies readonly BackendRole[];

export default function CertificatesLayout({
  children,
}: LayoutProps<"/certificates">) {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
