'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssetStatusBadge } from '@/lib/status-badges';
import type { CategoryAsset, CategoryBucket } from '@/app/(dashboard)/reportes/page';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
}

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

  const active = openCategory ? categories[openCategory] : null;

  return (
    <>
      <div className="space-y-1">
        {entries.map(([name, info]) => (
          <button
            key={name}
            type="button"
            onClick={() => setOpenCategory(name)}
            className="flex w-full items-center justify-between rounded-md p-2 text-left transition hover:bg-muted focus:bg-muted focus:outline-none"
          >
            <div>
              <span className="text-sm font-medium">{name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                ({info.count} activos)
              </span>
            </div>
            <span className="text-sm font-mono">{formatCurrency(info.value)}</span>
          </button>
        ))}
      </div>

      <Dialog
        open={openCategory !== null}
        onOpenChange={(next) => !next && setOpenCategory(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{openCategory}</DialogTitle>
            <DialogDescription>
              {active
                ? `${active.count} activo${active.count === 1 ? '' : 's'} · Valor total ${formatCurrency(active.value)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          {active && <CategoryAssetsTable assets={active.assets} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryAssetsTable({ assets }: { assets: CategoryAsset[] }) {
  const sorted = [...assets].sort((a, b) => a.code.localeCompare(b.code));
  return (
    <ScrollArea className="max-h-[60vh]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell className="font-mono text-sm">
                <Link
                  href={`/activos/${asset.id}`}
                  className="text-primary hover:underline"
                >
                  {asset.code}
                </Link>
              </TableCell>
              <TableCell>{asset.name}</TableCell>
              <TableCell>
                <AssetStatusBadge status={asset.status} />
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(asset.commercial_value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
