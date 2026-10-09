import type { Metadata } from "next";

import { StudentProfilePage } from "@/components/certificates/StudentProfilePage";

export const metadata: Metadata = {
  title: "Perfil del estudiante | Gestión de Certificados",
  description: "Consulta los datos personales y académicos del estudiante.",
};

/**
 * Student profile route.
 *
 * The URL carries no identifier on purpose — the selected student is
 * passed between the search page and this page via sessionStorage
 * (see `@/lib/certificates/searchSession`). Opening this URL directly
 * shows a "select a student first" state rather than a broken page.
 */
export default function StudentProfileRoute() {
  return <StudentProfilePage />;
}
