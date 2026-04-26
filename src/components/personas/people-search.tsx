'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export function PeopleSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const isFirstRender = useRef(true);

  const push = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set('search', value);
      else params.delete('search');
      params.delete('page');
      router.push(`/personas?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const t = setTimeout(() => push(search), 300);
    return () => clearTimeout(t);
  }, [search, push]);

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
