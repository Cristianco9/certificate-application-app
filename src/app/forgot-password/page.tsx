import type { Metadata } from "next";

import { ForgotPasswordPage } from "@/components/login/ForgotPasswordPage";

export const metadata: Metadata = {
  title: "Recuperar contraseña | Gestión de Certificados",
  description:
    "Restablece la contraseña de tu cuenta del sistema de certificados académicos.",
};

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
}
