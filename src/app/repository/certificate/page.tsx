import type { Metadata } from "next";

import { CertificateDetailPage } from "@/components/certificates/CertificateDetailPage";

export const metadata: Metadata = {
  title: "Detalle del certificado | Gestión de Certificados",
  description:
    "Información detallada del certificado: receptor, estudiante, matrículas e información de entrega.",
};

/**
 * Certificate detail route.
 *
 * The URL deliberately carries no identifier — the selected certificate
 * is passed from the repository table via sessionStorage (see
 * `@/lib/certificates/repositorySession`). Opening this URL directly
 * shows a "select a certificate first" state rather than a broken page.
 */
export default function CertificateDetailRoute() {
  return <CertificateDetailPage />;
}
