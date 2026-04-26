import Link from 'next/link';
import { getAssets } from '@/lib/actions/assets';
import { getCategories } from '@/lib/actions/categories';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AssetStatusBadge } from '@/lib/status-badges';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Package } from 'lucide-react';
import { AssetFilters } from '@/components/activos/asset-filters';

const PAGE_SIZE = 25;

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
  searchParams: Promise<{
    status?: string;
    category_id?: string;
    search?: string;
    insured?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));

  const [assetsRes, categories] = await Promise.all([
    getAssets({ ...params, page, pageSize: PAGE_SIZE }),
    getCategories(),
  ]);
  const { rows: assets, total } = assetsRes;
  const hasFilters = Boolean(params.status || params.category_id || params.search || params.insured);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Activos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inventario completo de equipos, mobiliario, vehículos y electrodomésticos.
          </p>
        </div>
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
          <CardTitle>Inventario ({total} activos)</CardTitle>
          {total > 0 && (
            <CardDescription>
              {hasFilters ? 'Resultados filtrados' : 'Todos los activos registrados'}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {total === 0 && !hasFilters ? (
            <EmptyState
              icon={Package}
              title="Aún no hay activos registrados"
              description="Comienza registrando tu primer activo. Puedes subir la factura y dejar que la IA complete los datos."
              cta={{ label: 'Registrar primer activo', href: '/activos/nuevo' }}
            />
          ) : (
          <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
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
                    <TableCell>{(asset.category as unknown as { name: string } | null)?.name}</TableCell>
                    <TableCell>
                      <AssetStatusBadge status={asset.status} />
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {(asset as unknown as { quantity?: number }).quantity ?? 1}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatCurrency(Number(asset.commercial_value))}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {asset.entry_date}
                    </TableCell>
                  </TableRow>
                ))}
                {assets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay activos que coincidan con los filtros
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination total={total} pageSize={PAGE_SIZE} />
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
