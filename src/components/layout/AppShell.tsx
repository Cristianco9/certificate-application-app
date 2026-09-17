"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { dashboardNavigation } from "@/constants/navigation";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b px-6 py-5">
            <p className="text-sm font-medium text-muted-foreground">
              Historicos academicos
            </p>
            <h1 className="mt-1 text-lg font-semibold">
              Gestion de Certificados
            </h1>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {dashboardNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Gestion de Certificados</span>
            <nav className="flex gap-1 overflow-x-auto">
              {dashboardNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    className={cn(
                      "flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                      isActive &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                    )}
                    href={item.href}
                    key={item.href}
                    aria-label={item.label}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
