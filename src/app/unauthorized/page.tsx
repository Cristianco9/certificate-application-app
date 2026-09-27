import type { Metadata } from "next";
import { Suspense } from "react";

import { UnauthorizedContent } from "./UnauthorizedContent";

export const metadata: Metadata = {
  title: "Acceso denegado | Gestión de Certificados",
  description: "No tienes permisos para acceder a esta sección.",
};

export default function UnauthorizedPage() {
  // `useSearchParams()` in the child forces this subtree to render
  // client-side. Next.js requires a Suspense boundary around it.
  return (
    <Suspense fallback={null}>
      <UnauthorizedContent />
    </Suspense>
  );
}
