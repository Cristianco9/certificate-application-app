"use client";

import { useState, type ReactNode } from "react";
import { Menu } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";

type AppShellProps = {
  children: ReactNode;
};

/**
 * Authenticated page frame: sidebar (1/5 width on desktop, drawer on
 * smaller screens) + page content. Wrap any protected route with it.
 */
export function AppShell({ children }: AppShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Top bar — visible below lg only */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-[#3B5FC7] px-4 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menú de navegación"
          aria-expanded={isSidebarOpen}
          aria-controls="app-sidebar"
          className="
            rounded-md p-2 hover:bg-white/10
            focus-visible:ring-2 focus-visible:ring-white/70
            focus-visible:outline-none
          "
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <span className="text-lg font-extrabold tracking-tight">
          Certificados
        </span>
      </header>

      <Sidebar
        open={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
