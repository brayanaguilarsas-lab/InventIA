import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/reportes/export-button';
import { CategoryAssetsList } from '@/components/reportes/category-assets-list';
import {
  Package,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  Wrench,
  XCircle,
  Shield,
} from 'lucide-react';

export interface CategoryAsset {
  id: string;
  code: string;
  name: string;
  status: string;
  commercial_value: number;
}

export interface CategoryBucket {
  count: number;
  value: number;
  assets: CategoryAsset[];
}

const EMPTY_DASHBOARD = {
  totalAssets: 0,
  totalValue: 0,
  totalPeople: 0,
  byStatus: { disponible: 0, asignado: 0, mantenimiento: 0, baja: 0 },
  byCategory: {} as Record<string, CategoryBucket>,
  insuredCount: 0,
  insuranceAlerts: [] as Array<{
    id: string;
    code: string;
    name: string;
    insurer_name: string | null;
    insurance_end: string | null;
  }>,
};

async function getDashboardData(): Promise<typeof EMPTY_DASHBOARD> {
  const supabase = await createClient();

  // 4 queries en paralelo: 3 agregados por status + activos + alertas.
  // Filtros en SQL, no en JS — reduce payload y CPU en el server.
  const [activeRes, bajaCountRes, peopleRes, insuranceAlertsRes] = await Promise.all([
    // Todos los activos NO dados de baja (para status breakdown + totales + categorías)
    supabase
      .from('assets')
      .select('id, code, name, status, commercial_value, has_insurance, category:categories(name)')
      .neq('status', 'baja'),
    // Solo el conteo de bajas
    supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'baja'),
    supabase.from('people').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('assets')
      .select('id, code, name, insurer_name, insurance_end')
      .eq('has_insurance', true)
      .not('insurance_end', 'is', null)
      .lte('insurance_end', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .neq('status', 'baja'),
  ]);

  if (activeRes.error) {
    console.error('[Dashboard] assets query failed:', activeRes.error.message);
    return EMPTY_DASHBOARD;
  }
  if (peopleRes.error) {
    console.error('[Dashboard] people query failed:', peopleRes.error.message);
  }
  if (insuranceAlertsRes.error) {
    console.error('[Dashboard] insurance query failed:', insuranceAlertsRes.error.message);
  }
  const insuranceAlerts = insuranceAlertsRes;

  const activeAssets = activeRes.data ?? [];
  const totalValue = activeAssets.reduce((sum, a) => sum + (Number(a.commercial_value) || 0), 0);

  const byStatus = {
    disponible: 0,
    asignado: 0,
    mantenimiento: 0,
    baja: bajaCountRes.count ?? 0,
  };

  const byCategory: Record<string, CategoryBucket> = {};
  let insuredCount = 0;

  // Un solo pase por activeAssets → status + categoría + asegurados.
  for (const asset of activeAssets) {
    if (asset.status === 'disponible') byStatus.disponible++;
    else if (asset.status === 'asignado') byStatus.asignado++;
    else if (asset.status === 'mantenimiento') byStatus.mantenimiento++;

    const cat = asset.category as unknown as { name: string } | null;
    const catName = cat?.name ?? 'Sin categoría';
    const value = Number(asset.commercial_value) || 0;
    const bucket = byCategory[catName] ?? { count: 0, value: 0, assets: [] };
    bucket.count++;
    bucket.value += value;
    bucket.assets.push({
      id: asset.id,
      code: asset.code,
      name: asset.name,
      status: asset.status,
      commercial_value: value,
    });
    byCategory[catName] = bucket;

    if (asset.has_insurance) insuredCount++;
  }

  return {
    totalAssets: activeAssets.length,
    totalValue,
    totalPeople: peopleRes.count ?? 0,
    byStatus,
    byCategory,
    insuredCount,
    insuranceAlerts: insuranceAlerts.data ?? [],
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen ejecutivo del inventario y alertas clave.
          </p>
        </div>
        <ExportButton />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/activos" className="block">
          <Card className="transition hover:ring-2 hover:ring-primary/40 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Activos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalAssets}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/activos" className="block">
          <Card className="transition hover:ring-2 hover:ring-primary/40 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.totalValue)}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/personas" className="block">
          <Card className="transition hover:ring-2 hover:ring-primary/40 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Personas Activas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalPeople}</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/activos?insured=1" className="block">
          <Card className="transition hover:ring-2 hover:ring-primary/40 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Asegurados</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.insuredCount}/{data.totalAssets}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/activos?status=disponible" className="flex items-center justify-between rounded-md p-2 transition hover:bg-muted">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Disponible</span>
              </div>
              <Badge variant="secondary">{data.byStatus.disponible}</Badge>
            </Link>
            <Link href="/activos?status=asignado" className="flex items-center justify-between rounded-md p-2 transition hover:bg-muted">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Asignado</span>
              </div>
              <Badge variant="secondary">{data.byStatus.asignado}</Badge>
            </Link>
            <Link href="/activos?status=mantenimiento" className="flex items-center justify-between rounded-md p-2 transition hover:bg-muted">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">En Mantenimiento</span>
              </div>
              <Badge variant="secondary">{data.byStatus.mantenimiento}</Badge>
            </Link>
            <Link href="/activos?status=baja" className="flex items-center justify-between rounded-md p-2 transition hover:bg-muted">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Dado de Baja</span>
              </div>
              <Badge variant="secondary">{data.byStatus.baja}</Badge>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valor por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryAssetsList categories={data.byCategory} />
          </CardContent>
        </Card>
      </div>

      {/* Insurance Alerts */}
      {data.insuranceAlerts.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              Pólizas Próximas a Vencer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.insuranceAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <span className="font-medium">{alert.code}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{alert.name}</span>
                </div>
                <div className="text-right text-sm">
                  <div className="text-muted-foreground">{alert.insurer_name}</div>
                  <div className="font-mono text-yellow-500">
                    Vence: {alert.insurance_end}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
