import type { Metadata } from "next";

import { CertificatePreviewPage } from "@/components/certificates/CertificatePreviewPage";

export const metadata: Metadata = {
  title: "Vista previa del certificado | Gestión de Certificados",
  description:
    "Revisa el certificado académico antes de imprimirlo o descargarlo.",
};

/**
 * Certificate preview route.
 *
 * Reads the enrollment selection from sessionStorage (see
 * `@/lib/certificates/previewSession`), fetches the next available act
 * number from the backend, and renders the preview chrome. The actual
 * certificate body is intentionally NOT generated here yet — this page
 * is the shell that will host it once the generation workflow is in
 * place.
 */
export default function CertificatePreviewRoute() {
  return <CertificatePreviewPage />;
}
