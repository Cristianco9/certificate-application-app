import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registro académico | Gestión de Certificados",
  description: "Panel de registro de estudiantes y matrículas.",
};

export default function AcademicRegistryPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-[#1F2937]">
        Registro académico
      </h1>
    </main>
  );
}
