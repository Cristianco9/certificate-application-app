import { RoleGuard } from "@/components/auth/RoleGuard";

export default function AcademicRegistryLayout({
  children,
}: LayoutProps<"/academic-registry">) {
  return (
    <RoleGuard
      allowedRoles={[
        "Máster",
        "Administrador",
        "Auxiliar",
      ]}
    >
      {children}
    </RoleGuard>
  );
}
