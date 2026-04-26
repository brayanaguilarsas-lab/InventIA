'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssetStatusBadge } from '@/lib/status-badges';
import { ArrowUpRight, Package } from 'lucide-react';
import type { CategoryBucket } from '@/app/(dashboard)/reportes/page';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

const STATUS_DOTS: Record<string, { label: string; color: string }> = {
  disponible: { label: 'Disponibles', color: 'bg-green-500' },
  asignado: { label: 'Asignados', color: 'bg-blue-500' },
  mantenimiento: { label: 'En mantenimiento', color: 'bg-amber-500' },
  baja: { label: 'Dados de baja', color: 'bg-red-500' },
};

export function CategoryAssetsList({
  categories,
}: {
  categories: Record<string, CategoryBucket>;
}) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const entries = Object.entries(categories);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay activos registrados</p>;
  }

  const grandTotal = entries.reduce((s, [, b]) => s + b.value, 0);
  const active = openCategory ? categories[openCategory] : null;

  return (
    <>
      <div className="space-y-1">
        {entries.map(([name, info]) => {
          const pct = grandTotal > 0 ? (info.value / grandTotal) * 100 : 0;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setOpenCategory(name)}
              className="group flex w-full items-center justify-between gap-4 rounded-md p-2 text-left transition hover:bg-muted focus:bg-muted focus:outline-none"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({info.count} {info.count === 1 ? 'activo' : 'activos'})
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary/70 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-mono tabular-nums">
                  {formatCurrency(info.value)}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </div>
            </button>
          );
        })}
      </div>

      <Dialog
        open={openCategory !== null}
        onOpenChange={(next) => !next && setOpenCategory(null)}
      >
        <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden">
          {active && <CategoryDetail name={openCategory!} bucket={active} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryDetail({ name, bucket }: { name: string; bucket: CategoryBucket }) {
  const breakdown = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const a of bucket.assets) acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, [bucket.assets]);

  const sorted = useMemo(
    () => [...bucket.assets].sort((a, b) => a.code.localeCompare(b.code)),
    [bucket.assets]
  );

  return (
    <>
      <DialogHeader className="border-b px-6 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base">{name}</DialogTitle>
            <DialogDescription>
              {bucket.count} {bucket.count === 1 ? 'activo' : 'activos'} · Valor total{' '}
              <span className="font-mono text-foreground">{formatCurrency(bucket.value)}</span>
            </DialogDescription>
          </div>
        </div>

        {Object.keys(breakdown).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {Object.entries(breakdown).map(([status, count]) => {
              const dot = STATUS_DOTS[status] ?? { label: status, color: 'bg-muted-foreground' };
              return (
                <div key={status} className="flex items-center gap-1.5 text-xs">
                  <span className={`h-2 w-2 rounded-full ${dot.color}`} />
                  <span className="text-muted-foreground">{dot.label}</span>
                  <span className="font-medium tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </DialogHeader>

      <ScrollArea className="max-h-[60vh]">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <colgroup>
            <col className="w-[140px]" />
            <col />
            <col className="w-[150px]" />
            <col className="w-[140px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-popover">
            <tr className="text-xs text-muted-foreground">
              <th className="border-b px-6 py-2.5 text-left font-medium">Código</th>
              <th className="border-b px-2 py-2.5 text-left font-medium">Nombre</th>
              <th className="border-b px-2 py-2.5 text-left font-medium">Estado</th>
              <th className="border-b px-6 py-2.5 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((asset) => (
              <tr key={asset.id} className="group transition hover:bg-muted/40">
                <td className="border-b border-border/50 px-6 py-2.5 align-middle">
                  <Link
                    href={`/activos/${asset.id}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {asset.code}
                  </Link>
                </td>
                <td className="border-b border-border/50 px-2 py-2.5 align-middle">
                  <span className="block truncate" title={asset.name}>
                    {asset.name}
                  </span>
                </td>
                <td className="border-b border-border/50 px-2 py-2.5 align-middle">
                  <AssetStatusBadge status={asset.status} />
                </td>
                <td className="border-b border-border/50 px-6 py-2.5 text-right align-middle font-mono text-xs tabular-nums">
                  {formatCurrency(asset.commercial_value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </>
  );
}
