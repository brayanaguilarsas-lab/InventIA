import { getAssignments } from '@/lib/actions/assignments';
import { getAvailableAssets } from '@/lib/actions/assets';
import { getActivePeople } from '@/lib/actions/people';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReturnConditionBadge } from '@/lib/status-badges';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AssignmentActions } from '@/components/asignaciones/assignment-actions';
import { NewAssignmentDialog } from '@/components/asignaciones/new-assignment-dialog';
import { AssignmentEditMenu } from '@/components/asignaciones/assignment-edit-menu';
import { DownloadActaButton } from '@/components/asignaciones/download-acta-button';

export default async function AssignmentsPage() {
  const [assignments, availableAssets, activePeople] = await Promise.all([
    getAssignments(),
    getAvailableAssets(),
    getActivePeople(),
  ]);

  const activeAssignments = assignments.filter((a) => a.is_active);
  const pastAssignments = assignments.filter((a) => !a.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Asignaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Entrega de activos a personas. Cada asignación genera acta PDF que se envía por correo.
          </p>
        </div>
        <NewAssignmentDialog assets={availableAssets} people={activePeople} />
      </div>

      {/* Active Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Asignaciones Activas ({activeAssignments.length})</CardTitle>
          <CardDescription>Activos actualmente en uso por su responsable</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Persona</TableHead>
                <TableHead>Fecha Asignación</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    {(assignment.asset as unknown as { name: string } | null)?.name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {(assignment.asset as unknown as { code: string } | null)?.code}
                  </TableCell>
                  <TableCell>
                    {(assignment.person as unknown as { full_name: string } | null)?.full_name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {new Date(assignment.assigned_at).toLocaleDateString('es-CO')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <DownloadActaButton assignmentId={assignment.id} tipo="entrega" />
                      <AssignmentActions assignmentId={assignment.id} />
                      <AssignmentEditMenu
                        assignmentId={assignment.id}
                        assetCode={
                          (assignment.asset as unknown as { code: string } | null)?.code ?? ''
                        }
                        assetName={
                          (assignment.asset as unknown as { name: string } | null)?.name ?? ''
                        }
                        personId={assignment.person_id}
                        personName={
                          (assignment.person as unknown as { full_name: string } | null)?.full_name ?? ''
                        }
                        personIsSpartian={
                          !!(assignment.person as unknown as { is_spartian?: boolean } | null)?.is_spartian
                        }
                        people={activePeople.map((p) => ({
                          id: p.id,
                          full_name: p.full_name,
                          area: p.area,
                        }))}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {activeAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay asignaciones activas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Past Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Asignaciones</CardTitle>
          <CardDescription>Asignaciones cerradas con acta de paz y salvo</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Persona</TableHead>
                <TableHead>Asignación</TableHead>
                <TableHead>Devolución</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Actas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    {(assignment.asset as unknown as { name: string } | null)?.name}
                  </TableCell>
                  <TableCell>
                    {(assignment.person as unknown as { full_name: string } | null)?.full_name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {new Date(assignment.assigned_at).toLocaleDateString('es-CO')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {assignment.returned_at
                      ? new Date(assignment.returned_at).toLocaleDateString('es-CO')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <ReturnConditionBadge condition={assignment.return_condition} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <DownloadActaButton assignmentId={assignment.id} tipo="entrega" />
                      <DownloadActaButton assignmentId={assignment.id} tipo="devolucion" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pastAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay historial de asignaciones
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
