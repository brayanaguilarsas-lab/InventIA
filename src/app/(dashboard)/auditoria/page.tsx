import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList } from 'lucide-react';

const actionLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  crear_activo: { label: 'Crear activo', variant: 'default' },
  actualizar_activo: { label: 'Actualizar activo', variant: 'outline' },
  crear_persona: { label: 'Crear persona', variant: 'default' },
  actualizar_persona: { label: 'Actualizar persona', variant: 'outline' },
  activar_persona: { label: 'Activar persona', variant: 'default' },
  desactivar_persona: { label: 'Desactivar persona', variant: 'secondary' },
  asignar_activo: { label: 'Asignar activo', variant: 'default' },
  devolver_activo: { label: 'Devolver activo', variant: 'secondary' },
  enviar_mantenimiento: { label: 'Enviar a mantenimiento', variant: 'outline' },
  retorno_mantenimiento: { label: 'Retorno mantenimiento', variant: 'secondary' },
  dar_baja_activo: { label: 'Dar de baja', variant: 'destructive' },
  crear_categoria: { label: 'Crear categoría', variant: 'default' },
  actualizar_categoria: { label: 'Actualizar categoría', variant: 'outline' },
  eliminar_categoria: { label: 'Eliminar categoría', variant: 'destructive' },
};

async function getAuditLogs(page: number = 1, limit: number = 50) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from('audit_log')
    .select('*, user:user_profiles(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { logs: data ?? [], total: count ?? 0 };
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { logs, total } = await getAuditLogs(page);
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Log de Auditoría</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{total} registros</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const user = log.user as unknown as { full_name: string; email: string } | null;
                const action = actionLabels[log.action];
                const details = log.details as Record<string, unknown>;
                const detailStr = Object.entries(details)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ');

                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es-CO')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user?.full_name ?? user?.email ?? 'Sistema'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={action?.variant ?? 'outline'}>
                        {action?.label ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.entity_type}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {detailStr || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay registros de auditoría
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`/auditoria?page=${p}`}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                    p === page
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-accent'
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
