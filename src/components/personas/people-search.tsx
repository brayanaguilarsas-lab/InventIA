'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export function PeopleSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';
  const [search, setSearch] = useState(initialSearch);

  // Guarda el último valor pusheado para no re-disparar la navegación
  // si el efecto se vuelve a ejecutar por cambios externos (p.ej. el
  // usuario fue a página 2 y la URL cambió, pero `search` no).
  const lastPushedRef = useRef(initialSearch);

  useEffect(() => {
    if (search === lastPushedRef.current) return;
    const t = setTimeout(() => {
      lastPushedRef.current = search;
      const params = new URLSearchParams(window.location.search);
      if (search) params.set('search', search);
      else params.delete('search');
      // Cambiar el término de búsqueda resetea la paginación.
      params.delete('page');
      const qs = params.toString();
      router.push(qs ? `/personas?${qs}` : '/personas');
    }, 300);
    return () => clearTimeout(t);
  }, [search, router]);

  return (
    <div className="flex items-center gap-3">
      <Hint label="Búsqueda de personas" description="Por nombre, número de identificación o correo">
        <Input
          placeholder="Buscar por nombre, identificación o correo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </Hint>
      {search && (
        <Hint label="Limpiar búsqueda">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              lastPushedRef.current = '';
              router.push('/personas');
            }}
          >
            <X className="mr-2 h-3 w-3" />
            Limpiar
          </Button>
        </Hint>
      )}
    </div>
  );
}
