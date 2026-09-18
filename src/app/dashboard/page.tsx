import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Gestión de Certificados",
  description: "Panel principal del sistema de certificados académicos.",
};

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#1F2937]">
        Dashboard
      </h1>
    </main>
  );
}
