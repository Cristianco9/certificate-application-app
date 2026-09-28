"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  Home,
  LogOut,
  Search,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

import { useLogout } from "@/hooks/useLogout";
import { getSessionState } from "@/lib/auth/session";
import { can } from "@/permissions/authorization";
import { PERMISSIONS, type Permission } from "@/permissions/permissions";
import { LANDING_BY_ROLE, type BackendRole } from "@/permissions/roles";

import type { AuthenticatedUser } from "@/types/auth";

type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Omit for items every authenticated user must see. */
  permission?: Permission;
  getHref: (role: BackendRole) => string;
};

const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "certificates",
    label: "Generar certificado",
    icon: Search,
    permission: PERMISSIONS.NAV_CERTIFICATES,
    getHref: () => "/certificates",
  },
  {
    // Máster, Administrador, Funcionario, Rector. Auxiliar does not have
    // NAV_DASHBOARD, so it sees "Registro académico" instead.
    key: "home",
    label: "Menu",
    icon: Home,
    permission: PERMISSIONS.NAV_DASHBOARD,
    getHref: (role) => LANDING_BY_ROLE[role],
  },
  {
    // Máster, Administrador and Auxiliar only (see permissions.ts).
    key: "academic-registry",
    label: "Registro académico",
    icon: BookOpen,
    permission: PERMISSIONS.NAV_ACADEMIC_REGISTRY,
    getHref: () => "/academic-registry",
  },
  {
    key: "repository",
    label: "Repositorio",
    icon: Bookmark,
    permission: PERMISSIONS.NAV_REPOSITORY,
    getHref: () => "/repository",
  },
];

type SidebarProps = {
  /** Only meaningful below `lg`, where the sidebar is a drawer. */
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const logout = useLogout();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  // localStorage is client-only, so read the session after mount.
  useEffect(() => {
    const session = getSessionState();
    if (session.status === "authenticated") {
      setUser(session.user);
    }
  }, []);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const visibleItems = user
    ? NAV_ITEMS.filter(
        (item) => !item.permission || can(user, item.permission)
      )
    : [];

  return (
    <>
      {/* Overlay — mobile drawer only */}
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Navegación principal"
        className={`
          fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] flex-col
          bg-[#3B5FC7] text-white
          transition-[transform,visibility] duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full max-lg:invisible"}
          lg:sticky lg:top-0 lg:z-auto lg:w-1/5 lg:min-w-56 lg:shrink-0
          lg:translate-x-0
        `}
      >
        {/* Close button — mobile drawer only */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar menú de navegación"
          className="
            absolute top-3 right-3 rounded-md p-2 text-white/90
            hover:bg-white/10
            focus-visible:ring-2 focus-visible:ring-white/70
            focus-visible:outline-none lg:hidden
          "
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-8 xl:px-6">
          {/* Avatar + title */}
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className="
                flex h-24 w-24 items-center justify-center overflow-hidden
                rounded-full border-4 border-white bg-[#B3C7FA] xl:h-28 xl:w-28
              "
            >
              <User className="h-14 w-14 fill-[#6E92FA] text-[#6E92FA] xl:h-16 xl:w-16" />
            </span>
            <p className="mt-4 text-2xl font-extrabold tracking-tight uppercase xl:text-3xl">
              Inicio
            </p>
          </div>

          {/* Navigation */}
          <nav aria-label="Secciones" className="mt-6">
            <ul className="border-b border-white">
              {user &&
                visibleItems.map((item) => {
                  const href = item.getHref(user.role);
                  const isActive =
                    pathname === href || pathname.startsWith(`${href}/`);
                  const Icon = item.icon;

                  return (
                    <li key={item.key} className="border-t border-white">
                      <Link
                        href={href}
                        onClick={onClose}
                        aria-current={isActive ? "page" : undefined}
                        className={`
                          grid min-h-14 grid-cols-[1.25rem_1fr_1.25rem]
                          items-center gap-2 px-2 py-3 text-sm font-bold
                          transition xl:text-base
                          hover:bg-white/10
                          focus-visible:bg-white/10 focus-visible:outline-none
                          ${isActive ? "bg-white/15" : ""}
                        `}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span className="text-center leading-tight">
                          {item.label}
                        </span>
                        <span aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </nav>
        </div>

        {/* Logout */}
        <div className="px-5 pt-4 pb-8 xl:px-6">
          <button
            type="button"
            onClick={logout}
            className="
              inline-flex h-12 w-full items-center justify-center gap-2.5
              rounded-xl border border-[#B8382E] bg-[#F3EFEF]
              text-sm font-bold text-[#B8382E] transition xl:text-base
              hover:bg-white
              focus-visible:ring-4 focus-visible:ring-white/40
              focus-visible:outline-none
              active:translate-y-px
            "
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
