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
  const prevDisabled = current <= 1;
  const nextDisabled = current >= totalPages;

  return (
    <div className="flex items-center justify-between pt-4 gap-4 flex-wrap">
      <span className="text-sm text-muted-foreground">
        Mostrando {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-2">
        {prevDisabled ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildHref(current - 1)} prefetch={false} />}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
        )}
        <span className="text-sm font-mono">
          {current} / {totalPages}
        </span>
        {nextDisabled ? (
          <Button variant="outline" size="sm" disabled>
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={buildHref(current + 1)} prefetch={false} />}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
