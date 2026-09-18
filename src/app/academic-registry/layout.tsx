import { requireRole } from "@/lib/auth/session";

export default async function AcademicRegistryLayout({
  children,
}: LayoutProps<"/academic-registry">) {
  await requireRole(["Máster", "Auxiliar"]);
  return <>{children}</>;
}
