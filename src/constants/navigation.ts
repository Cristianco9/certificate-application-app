import {
  Award,
  Database,
  Gauge,
  LucideIcon,
  Search,
  Users,
  Warehouse,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const dashboardNavigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/students", label: "Estudiantes", icon: Search },
  { href: "/certificates", label: "Certificados", icon: Award },
  { href: "/repository", label: "Repositorio", icon: Warehouse },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/database", label: "Base de datos", icon: Database },
];
