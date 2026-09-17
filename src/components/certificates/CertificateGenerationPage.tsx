import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export function CertificateGenerationPage() {
  return (
    <section>
      <PageHeader
        title="Certificados"
        description="Flujo de seleccion, revision y generacion de certificados academicos historicos."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {["Seleccionar estudiante", "Revisar historial", "Firmante autorizado"].map(
          (step) => (
            <article className="rounded-lg border bg-background p-4" key={step}>
              <h3 className="font-medium">{step}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Pendiente de conectar con el contrato real del backend.
              </p>
            </article>
          )
        )}
      </div>
      <Button className="mt-4" disabled>
        Generar certificado
      </Button>
    </section>
  );
}
