import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

const fields = [
  "Primer nombre",
  "Segundo nombre",
  "Apellidos",
  "Documento",
  "Tipo de documento",
  "Ultimo ano academico",
  "Grado",
  "Grupo",
  "Lugar de nacimiento",
];

export function StudentSearchPage() {
  return (
    <section>
      <PageHeader
        title="Estudiantes"
        description="Busqueda flexible de estudiantes historicos, incluso cuando no exista documento de identidad registrado."
      />
      <form className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-3">
        {fields.map((field) => (
          <label className="text-sm font-medium" key={field}>
            {field}
            <input className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
        ))}
        <div className="flex items-end gap-2 md:col-span-3">
          <Button type="submit">Buscar</Button>
          <Button variant="outline" type="reset">
            Limpiar filtros
          </Button>
        </div>
      </form>
    </section>
  );
}
