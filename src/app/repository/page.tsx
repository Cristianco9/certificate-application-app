import type { Metadata } from "next";

import { CertificateRepositoryPage } from "@/components/certificates/CertificateRepositoryPage";

export const metadata: Metadata = {
  title: "Repositorio de certificados | Gestión de Certificados",
  description:
    "Consulta todos los certificados generados por la aplicación y fíltralos por estudiante, año, grado, expedidor o receptor.",
};

export default function RepositoryRoute() {
  return <CertificateRepositoryPage />;
}
