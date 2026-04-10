import { notFound } from 'next/navigation';
import { getAssetById, getAssetHistory } from '@/lib/actions/assets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AssetStatus, FieldDefinition } from '@/types/database';
import { AssetActions } from '@/components/activos/asset-actions';

const statusLabels: Record<string, string> = {
  disponible: 'Disponible',
  asignado: 'Asignado',
  mantenimiento: 'En Mantenimiento',
  baja: 'Dado de Baja',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let asset;
  try {
    asset = await getAssetById(id);
  } catch {
    notFound();
  }

  const history = await getAssetHistory(id);
  const category = asset.category as { name: string; fields_schema: FieldDefinition[] } | null;
  const specificFields = (asset.specific_fields ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{asset.name}</h1>
          <p className="font-mono text-muted-foreground">{asset.code}</p>
        </div>
        <Badge variant={asset.status === 'disponible' ? 'default' : 'secondary'}>
          {statusLabels[asset.status] ?? asset.status}
        </Badge>
      </div>

      {/* Actions */}
      <AssetActions assetId={asset.id} status={asset.status as AssetStatus} />

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Categoría</span>
              <span className="text-sm font-medium">{category?.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor Comercial</span>
              <span className="text-sm font-mono font-medium">
                {formatCurrency(Number(asset.commercial_value))}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fecha de Compra</span>
              <span className="text-sm font-mono">{asset.purchase_date ?? 'N/A'}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Fecha de Ingreso</span>
              <span className="text-sm font-mono">{asset.entry_date}</span>
            </div>
          </CardContent>
        </Card>

        {/* Specific Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles Técnicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {category?.fields_schema?.map((field: FieldDefinition) => (
              <div key={field.name}>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{field.label}</span>
                  <span className="text-sm font-medium">
                    {(specificFields[field.name] as string) || 'N/A'}
                  </span>
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Insurance */}
        {asset.has_insurance && (
          <Card>
            <CardHeader>
              <CardTitle>Póliza de Seguro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Aseguradora</span>
                <span className="text-sm font-medium">{asset.insurer_name}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cobertura</span>
                <span className="text-sm font-mono">
                  {asset.insurance_start} — {asset.insurance_end}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assignment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Asignaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Fecha Asignación</TableHead>
                <TableHead>Fecha Devolución</TableHead>
                <TableHead>Estado Devolución</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{(a.person as { full_name: string } | null)?.full_name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {new Date(a.assigned_at).toLocaleDateString('es-CO')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {a.returned_at
                      ? new Date(a.returned_at).toLocaleDateString('es-CO')
                      : 'Activa'}
                  </TableCell>
                  <TableCell>
                    {a.return_condition === 'bueno' && <Badge>Bueno</Badge>}
                    {a.return_condition === 'con_daños' && (
                      <Badge variant="destructive">Con daños</Badge>
                    )}
                    {!a.return_condition && '-'}
                  </TableCell>
                </TableRow>
              ))}
              {history.assignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Sin asignaciones
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Mantenimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha Envío</TableHead>
                <TableHead>Fecha Retorno</TableHead>
                <TableHead>Estado Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.maintenances.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.reason}</TableCell>
                  <TableCell className="font-mono text-sm">{m.sent_at}</TableCell>
                  <TableCell className="font-mono text-sm">{m.returned_at ?? 'Pendiente'}</TableCell>
                  <TableCell>
                    {m.final_status === 'funcional' && <Badge>Funcional</Badge>}
                    {m.final_status === 'no_funcional' && (
                      <Badge variant="destructive">No funcional</Badge>
                    )}
                    {!m.final_status && '-'}
                  </TableCell>
                </TableRow>
              ))}
              {history.maintenances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Sin mantenimientos
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
