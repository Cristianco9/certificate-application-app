import type { Metadata } from "next";

import { WelcomePage } from "@/components/welcome/WelcomePage";

export const metadata: Metadata = {
  title: "Bienvenido | Gestión de Certificados",
  description:
    "Sistema de gestión de certificados académicos históricos para estudiantes graduados.",
};

export default function WelcomeRoute() {
  return <WelcomePage />;
}
