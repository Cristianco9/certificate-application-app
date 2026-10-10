import type { Metadata } from "next";

import { CertificateGenerationPage } from "@/components/certificates/CertificateGenerationPage";

export const metadata: Metadata = {
  title: "Generar certificado | Gestión de Certificados",
  description:
    "Selecciona las matrículas del estudiante y revisa sus calificaciones antes de generar el certificado académico.",
};

export default function CertificateGenerateRoute() {
  return <CertificateGenerationPage />;
}
