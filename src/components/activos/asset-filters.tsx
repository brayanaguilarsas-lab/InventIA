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
import { Hint } from '@/components/ui/hint';
import type { Category } from '@/types/database';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export function AssetFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(initialSearch);
  // Guarda el último valor pusheado para no re-disparar navegación cuando
  // searchParams cambia por motivos externos (ej. paginación).
  const lastPushedSearchRef = useRef(initialSearch);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== 'todos') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset page on filter change
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `/activos?${qs}` : '/activos');
  }

  // Debounce search: 300ms después de dejar de escribir.
  // Solo navega si el search cambió respecto al último pusheado.
  useEffect(() => {
    if (search === lastPushedSearchRef.current) return;
    const t = setTimeout(() => {
      lastPushedSearchRef.current = search;
      updateParams('search', search);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const currentStatus = searchParams.get('status') ?? 'todos';
  const currentCategory = searchParams.get('category_id') ?? 'todos';
  const hasFilters =
    search !== '' || currentStatus !== 'todos' || currentCategory !== 'todos';

  function clearAll() {
    setSearch('');
    lastPushedSearchRef.current = '';
    router.push('/activos');
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Hint label="Búsqueda" description="Filtra por código o nombre del activo">
        <Input
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </Hint>
      <Hint label="Filtrar por estado" description="Disponible, asignado, mantenimiento o baja">
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
      </Hint>
      <Hint label="Filtrar por categoría" description="Tecnología, mobiliario, vehículos…">
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
