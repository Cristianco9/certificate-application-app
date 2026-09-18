import { requireRole } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  await requireRole([
    "Máster",
    "Administrador",
    "Funcionario",
    "Rector",
  ]);
  return <>{children}</>;
}
