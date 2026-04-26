'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  total: number;
  pageSize: number;
  /** Nombre del search param (default "page") */
  paramName?: string;
}

export function Pagination({ total, pageSize, paramName = 'page' }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.max(1, Number(searchParams.get(paramName) ?? 1));

  if (totalPages <= 1) return null;

  function buildHref(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete(paramName);
    else params.set(paramName, String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  return (
    <div className="flex items-center justify-between pt-4 gap-4 flex-wrap">
      <span className="text-sm text-muted-foreground">
        Mostrando {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={buildHref(current - 1)}
          aria-disabled={current <= 1}
          tabIndex={current <= 1 ? -1 : undefined}
          className={current <= 1 ? 'pointer-events-none opacity-50' : ''}
        >
          <Button variant="outline" size="sm" disabled={current <= 1}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
        </Link>
        <span className="text-sm font-mono">
          {current} / {totalPages}
        </span>
        <Link
          href={buildHref(current + 1)}
          aria-disabled={current >= totalPages}
          tabIndex={current >= totalPages ? -1 : undefined}
          className={current >= totalPages ? 'pointer-events-none opacity-50' : ''}
        >
          <Button variant="outline" size="sm" disabled={current >= totalPages}>
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
