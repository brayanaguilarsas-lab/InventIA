'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category } from '@/types/database';
import { useCallback } from 'react';

export function AssetFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'todos') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/activos?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-4">
      <Input
        placeholder="Buscar por nombre o código..."
        defaultValue={searchParams.get('search') ?? ''}
        onChange={(e) => updateParams('search', e.target.value)}
        className="max-w-xs"
      />
      <Select
        defaultValue={searchParams.get('status') ?? 'todos'}
        onValueChange={(v) => v && updateParams('status', v)}
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
        defaultValue={searchParams.get('category_id') ?? 'todos'}
        onValueChange={(v) => v && updateParams('category_id', v)}
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
    </div>
  );
}
