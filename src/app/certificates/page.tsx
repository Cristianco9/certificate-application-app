import type { Metadata } from "next";

import { CertificateGeneratorPage } from "@/components/certificates/CertificateGeneratorPage";

export const metadata: Metadata = {
  title: "Generar certificado | Gestión de Certificados",
  description:
    "Busca un estudiante en el archivo histórico y genera su certificado académico.",
};

export default function CertificatesRoute() {
  return <CertificateGeneratorPage />;
}
