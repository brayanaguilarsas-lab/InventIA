import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/reportes/export-button';
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

async function getDashboardData() {
  const supabase = await createClient();

  const [assetsRes, peopleRes, insuranceAlerts] = await Promise.all([
    supabase.from('assets').select('status, commercial_value, category:categories(name)'),
    supabase.from('people').select('id').eq('is_active', true),
    supabase
      .from('assets')
      .select('id, code, name, insurer_name, insurance_end')
      .eq('has_insurance', true)
      .not('insurance_end', 'is', null)
      .lte('insurance_end', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .neq('status', 'baja'),
  ]);

  const assets = assetsRes.data ?? [];
  const activeAssets = assets.filter((a) => a.status !== 'baja');

  const totalValue = activeAssets.reduce((sum, a) => sum + (Number(a.commercial_value) || 0), 0);

  const byStatus = {
    disponible: assets.filter((a) => a.status === 'disponible').length,
    asignado: assets.filter((a) => a.status === 'asignado').length,
    mantenimiento: assets.filter((a) => a.status === 'mantenimiento').length,
    baja: assets.filter((a) => a.status === 'baja').length,
  };

  const byCategory: Record<string, { count: number; value: number }> = {};
  for (const asset of activeAssets) {
    const cat = asset.category as unknown as { name: string } | null;
    const catName = cat?.name ?? 'Sin categoría';
    if (!byCategory[catName]) byCategory[catName] = { count: 0, value: 0 };
    byCategory[catName].count++;
    byCategory[catName].value += Number(asset.commercial_value) || 0;
  }

  const insuredCount = activeAssets.filter((a) => (a as { has_insurance?: boolean }).has_insurance !== false).length;

  return {
    totalAssets: activeAssets.length,
    totalValue,
    totalPeople: peopleRes.data?.length ?? 0,
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <ExportButton />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Activos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAssets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Personas Activas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPeople}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Asegurados
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.insuredCount}/{data.totalAssets}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado de Activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Disponible</span>
              </div>
              <Badge variant="secondary">{data.byStatus.disponible}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Asignado</span>
              </div>
              <Badge variant="secondary">{data.byStatus.asignado}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">En Mantenimiento</span>
              </div>
              <Badge variant="secondary">{data.byStatus.mantenimiento}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Dado de Baja</span>
              </div>
              <Badge variant="secondary">{data.byStatus.baja}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valor por Categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(data.byCategory).map(([name, info]) => (
              <div key={name} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({info.count} activos)
                  </span>
                </div>
                <span className="text-sm font-mono">{formatCurrency(info.value)}</span>
              </div>
            ))}
            {Object.keys(data.byCategory).length === 0 && (
              <p className="text-sm text-muted-foreground">No hay activos registrados</p>
            )}
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
