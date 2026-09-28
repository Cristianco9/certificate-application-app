import { RoleGuard } from "@/components/auth/RoleGuard";
import { AppShell } from "@/components/layout/AppShell";

export default function AcademicRegistryLayout({
  children,
}: LayoutProps<"/academic-registry">) {
  return (
    <RoleGuard allowedRoles={["Máster", "Administrador", "Auxiliar"]}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
