import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";

import type { BackendRole } from "@/permissions/roles";

/**
 * Every backend role that may reach the certificate-generation flow.
 * Mirrors `PERMISSIONS.NAV_CERTIFICATES` in `@/permissions/permissions`.
 */
const ALLOWED_ROLES = [
  "Máster",
  "Administrador",
  "Funcionario",
  "Auxiliar",
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
