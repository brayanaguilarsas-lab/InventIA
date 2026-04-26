import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { titleCase } from '@/lib/format';

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
  reenviar_acta: { label: 'Reenviar acta', variant: 'outline' },
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

interface AuditRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
  user: { full_name: string; email: string } | null;
}

async function getAuditLogs(page: number): Promise<{ logs: AuditRow[]; total: number; selectError: string | null }> {
  const supabase = await createClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // No hay FK directa entre audit_log.user_id y user_profiles.id (ambas
  // apuntan a auth.users). PostgREST no resuelve ese join, así que
  // hacemos dos queries y enriquecemos en JS.
  const { data, count, error } = await supabase
    .from('audit_log')
    .select('id, user_id, action, entity_type, entity_id, details, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    return { logs: [], total: 0, selectError: `${error.code}: ${error.message}` };
  }

  const rows = data ?? [];
  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id))
  );

  let usersMap: Record<string, { full_name: string; email: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    usersMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id as string, { full_name: p.full_name as string, email: p.email as string }])
    );
  }

  const logs: AuditRow[] = rows.map((r) => ({
    ...r,
    user: r.user_id ? usersMap[r.user_id] ?? null : null,
  }));

  return { logs, total: count ?? 0, selectError: null };
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const { logs, total, selectError } = await getAuditLogs(page);

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
          <CardTitle className="text-base">¿Cómo funciona la Auditoría?</CardTitle>
          <CardDescription>
            Bitácora inmutable de las acciones que cambian datos en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Se registra automáticamente.</span>{' '}
            Cada vez que alguien crea, edita o elimina un activo, una persona, una asignación,
            un mantenimiento, una baja, una categoría o un formato — el sistema guarda una
            entrada con quién, qué, cuándo y un resumen del cambio. <span className="italic">No hay nada que crear a mano.</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <GuideRow label="Fecha y Hora" desc="Momento exacto del evento (zona Colombia)." />
            <GuideRow label="Usuario" desc="Quién realizó la acción (logueado en ese momento)." />
            <GuideRow label="Acción" desc="Tipo de operación: crear_activo, asignar_activo, dar_baja, etc." />
            <GuideRow label="Entidad" desc="Tabla afectada: assets, people, assignments, maintenances..." />
            <GuideRow label="Detalles" desc="Campos relevantes (código, nombre, motivo) en formato clave: valor." />
          </div>
          <p className="border-t pt-3">
            <span className="text-foreground font-medium">Para verificar</span> que el sistema graba
            correctamente, usa <span className="italic">&quot;Probar registro de auditoría&quot;</span> arriba — inserta un evento
            de diagnóstico y muestra el resultado de cada paso (sesión, RLS, INSERT, JOIN).
          </p>
          <p>
            <span className="text-foreground font-medium">No es editable.</span> Los registros no se
            pueden modificar ni borrar desde la UI. Si necesitas exportar el log para auditoría
            externa, hazlo desde Supabase con un <code>SELECT</code> a <code>audit_log</code>.
          </p>
        </CardContent>
      </Card>

      {selectError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              <span className="font-medium">Error leyendo audit_log:</span>{' '}
              <code className="font-mono text-xs">{selectError}</code>
            </p>
          </CardContent>
        </Card>
      )}

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
                  const user = log.user;
                  const action = actionLabels[log.action];
                  const details = log.details;
                  const detailStr = Object.entries(details)
                    .map(([k, v]) => {
                      if (v === null || v === undefined) return `${k}: —`;
                      if (typeof v === 'object') return `${k}: ${JSON.stringify(v)}`;
                      return `${k}: ${v}`;
                    })
                    .join(', ');

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user?.full_name ? titleCase(user.full_name) : user?.email ?? 'Sistema'}
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

function GuideRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-xs font-medium text-foreground">{label}</div>
      <div className="text-[11px] leading-relaxed text-muted-foreground">{desc}</div>
    </div>
  );
}
