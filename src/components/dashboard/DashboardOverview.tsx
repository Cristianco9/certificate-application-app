import { PageHeader } from "@/components/layout/PageHeader";

const stats = [
  { label: "Certificados expedidos", value: "0" },
  { label: "Estudiantes registrados", value: "0" },
  { label: "Estudiantes aprobados", value: "0" },
  { label: "Estudiantes reprobados", value: "0" },
];

export function DashboardOverview() {
  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Resumen operativo para consultar certificados, estudiantes y resultados historicos."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article className="rounded-lg border bg-background p-4" key={stat.label}>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
