import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export function UserManagementPage() {
  return (
    <section>
      <PageHeader
        title="Usuarios"
        description="Administracion de usuarios, roles y datos de acceso segun permisos institucionales."
      />
      <div className="rounded-lg border bg-background p-4">
        <Button>Crear usuario</Button>
      </div>
    </section>
  );
}
