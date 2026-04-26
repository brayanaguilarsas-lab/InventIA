'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category } from '@/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export function AssetFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const isFirstRender = useRef(true);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'todos') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset page on filter change
      params.delete('page');
      router.push(`/activos?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Debounce search: 300ms después de dejar de escribir
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const t = setTimeout(() => updateParams('search', search), 300);
    return () => clearTimeout(t);
  }, [search, updateParams]);

  const currentStatus = searchParams.get('status') ?? 'todos';
  const currentCategory = searchParams.get('category_id') ?? 'todos';
  const hasFilters =
    search !== '' || currentStatus !== 'todos' || currentCategory !== 'todos';

  function clearAll() {
    setSearch('');
    router.push('/activos');
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Buscar por nombre o código..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <Select
        value={currentStatus}
        onValueChange={(v) => updateParams('status', v ?? 'todos')}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los estados</SelectItem>
          <SelectItem value="disponible">Disponible</SelectItem>
          <SelectItem value="asignado">Asignado</SelectItem>
          <SelectItem value="mantenimiento">En Mantenimiento</SelectItem>
          <SelectItem value="baja">Dado de Baja</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={currentCategory}
        onValueChange={(v) => updateParams('category_id', v ?? 'todos')}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todas las categorías</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll}>
          <X className="mr-2 h-3 w-3" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
