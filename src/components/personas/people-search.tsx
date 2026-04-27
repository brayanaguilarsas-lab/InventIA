'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { titleCase } from '@/lib/format';

export function PeopleSearch({ areas }: { areas: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(initialSearch);

  const lastPushedRef = useRef(initialSearch);

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '' || value === 'todas') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // Cualquier cambio de filtro resetea la paginación.
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `/personas?${qs}` : '/personas');
  }

  useEffect(() => {
    if (search === lastPushedRef.current) return;
    const t = setTimeout(() => {
      lastPushedRef.current = search;
      pushParams({ search });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const currentArea = searchParams.get('area') ?? 'todas';
  const hasFilters = search !== '' || currentArea !== 'todas';

  function clearAll() {
    setSearch('');
    lastPushedRef.current = '';
    router.push('/personas');
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Hint label="Búsqueda de personas" description="Por nombre, número de identificación o correo">
        <Input
          placeholder="Buscar por nombre, identificación o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-md"
        />
      </Hint>
      <Hint label="Filtrar por área" description="Growth, Operaciones, TI, Admin…">
        <Select
          value={currentArea}
          onValueChange={(v) => pushParams({ area: v ?? 'todas' })}
        >
          <SelectTrigger className="w-48" aria-label="Filtrar por área">
            <SelectValue placeholder="Área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las áreas</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area} value={area}>
                {titleCase(area)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Hint>
      {hasFilters && (
        <Hint label="Quitar todos los filtros activos">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="mr-2 h-3 w-3" />
            Limpiar filtros
          </Button>
        </Hint>
      )}
    </div>
  );
}
