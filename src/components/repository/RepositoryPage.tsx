import { PageHeader } from "@/components/layout/PageHeader";

export function RepositoryPage() {
  return (
    <section>
      <PageHeader
        title="Repositorio"
        description="Historial filtrable para consultar, descargar y reimprimir certificados ya expedidos."
      />
      <div className="rounded-lg border bg-background p-8 text-sm text-muted-foreground">
        La tabla del repositorio se conectara cuando el contrato de API este confirmado.
      </div>
    </section>
  );
}
