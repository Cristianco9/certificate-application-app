import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export function DatabaseImportPage() {
  return (
    <section>
      <PageHeader
        title="Base de datos"
        description="Importacion controlada de registros historicos mediante CSV con vista previa y validacion."
      />
      <div className="rounded-lg border bg-background p-4">
        <label className="block text-sm font-medium">
          Archivo CSV
          <input
            accept=".csv"
            className="mt-2 block w-full rounded-md border bg-background px-3 py-2 text-sm"
            type="file"
          />
        </label>
        <Button className="mt-4" disabled>
          Previsualizar importacion
        </Button>
      </div>
    </section>
  );
}
