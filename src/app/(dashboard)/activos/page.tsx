import Link from 'next/link';
import { getAssets } from '@/lib/actions/assets';
import { getCategories } from '@/lib/actions/categories';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { AssetFilters } from '@/components/activos/asset-filters';

const statusLabels: Record<string, string> = {
  disponible: 'Disponible',
  asignado: 'Asignado',
  mantenimiento: 'En Mantenimiento',
  baja: 'Dado de Baja',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  disponible: 'default',
  asignado: 'secondary',
  mantenimiento: 'outline',
  baja: 'destructive',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category_id?: string; search?: string }>;
}) {
  const params = await searchParams;
  const [assets, categories] = await Promise.all([
    getAssets(params),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Activos</h1>
        <Link href="/activos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Activo
          </Button>
        </Link>
      </div>

      <AssetFilters categories={categories} />

      <Card>
        <CardHeader>
          <CardTitle>
            Inventario ({assets.length} activos)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Fecha Ingreso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <Link
                      href={`/activos/${asset.id}`}
                      className="font-mono font-medium hover:underline"
                    >
                      {asset.code}
                    </Link>
                  </TableCell>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{(asset.category as { name: string } | null)?.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[asset.status] ?? 'default'}>
                      {statusLabels[asset.status] ?? asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(Number(asset.commercial_value))}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {asset.entry_date}
                  </TableCell>
                </TableRow>
              ))}
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay activos registrados
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
