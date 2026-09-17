import type { Metadata } from "next";

import { LoginPage } from "@/components/login/LoginPage";

export const metadata: Metadata = {
  title: "Iniciar sesión | Gestión de Certificados",
  description:
    "Acceso al sistema de gestión de certificados académicos históricos.",
};

export default function LoginRoute() {
  return <LoginPage />;
}
