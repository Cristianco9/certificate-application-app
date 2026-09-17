import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LoginForm() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <section className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-muted-foreground">
            Acceso institucional
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            Gestion de Certificados
          </h1>
        </div>
        <form className="space-y-4">
          <label className="block text-sm font-medium">
            Correo electronico
            <input
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              name="email"
              type="email"
            />
          </label>
          <label className="block text-sm font-medium">
            Contrasena
            <input
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              name="password"
              type="password"
            />
          </label>
          <Button className="w-full" type="submit">
            Ingresar
          </Button>
        </form>
        <Link
          className="mt-4 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground"
          href="/login"
        >
          Olvide mi contrasena
        </Link>
      </section>
    </main>
  );
}
