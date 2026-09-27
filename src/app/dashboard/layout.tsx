"use client";

import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuthExpiration } from "@/hooks/useAuthExpiration";

export default function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  useAuthExpiration();

  return (
    <RoleGuard
      allowedRoles={["Máster", "Administrador", "Funcionario", "Rector"]}
    >
      {children}
    </RoleGuard>
  );
}
