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
import { Pagination } from '@/components/ui/pagination';
import { ClipboardList } from 'lucide-react';
import { DiagnosticButton } from '@/components/auditoria/diagnostic-button';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const actionLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  crear_activo: { label: 'Crear activo', variant: 'default' },
  actualizar_activo: { label: 'Actualizar activo', variant: 'outline' },
  crear_persona: { label: 'Crear persona', variant: 'default' },
  actualizar_persona: { label: 'Actualizar persona', variant: 'outline' },
  activar_persona: { label: 'Activar persona', variant: 'default' },
  desactivar_persona: { label: 'Desactivar persona', variant: 'secondary' },
  asignar_activo: { label: 'Asignar activo', variant: 'default' },
  editar_asignacion: { label: 'Editar asignación', variant: 'outline' },
  eliminar_asignacion: { label: 'Eliminar asignación', variant: 'destructive' },
  devolver_activo: { label: 'Devolver activo', variant: 'secondary' },
  enviar_mantenimiento: { label: 'Enviar a mantenimiento', variant: 'outline' },
  retorno_mantenimiento: { label: 'Retorno mantenimiento', variant: 'secondary' },
  dar_baja_activo: { label: 'Dar de baja', variant: 'destructive' },
  crear_categoria: { label: 'Crear categoría', variant: 'default' },
  actualizar_categoria: { label: 'Actualizar categoría', variant: 'outline' },
  eliminar_categoria: { label: 'Eliminar categoría', variant: 'destructive' },
  importar_persona: { label: 'Importar persona', variant: 'outline' },
  marcar_spartian: { label: 'Marcar Spartian', variant: 'default' },
  desmarcar_spartian: { label: 'Desmarcar Spartian', variant: 'secondary' },
  actualizar_plantilla: { label: 'Actualizar plantilla', variant: 'outline' },
  restaurar_plantilla: { label: 'Restaurar plantilla', variant: 'secondary' },
  diagnostico_auditoria: { label: 'Diagnóstico auditoría', variant: 'outline' },
};

async function getAuditLogs(page: number) {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from('audit_log')
    .select('*, user:user_profiles(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  return { logs: data ?? [], total: count ?? 0 };
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const { logs, total } = await getAuditLogs(page);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Log de Auditoría</h1>
        </div>
        <DiagnosticButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{total.toLocaleString('es-CO')} registros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                      <TableCell className="max-w-md truncate text-xs text-muted-foreground" title={detailStr}>
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
          </div>
          <Pagination total={total} pageSize={PAGE_SIZE} />
        </CardContent>
      </Card>
    </div>
  );
}
