'use client';

import { useRouter } from 'next/navigation';
import { togglePersonActive } from '@/lib/actions/people';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserCheck, UserX, Pencil } from 'lucide-react';
import Link from 'next/link';

export function PersonActions({
  personId,
  isActive,
}: {
  personId: string;
  isActive: boolean;
}) {
  const router = useRouter();

  async function handleToggle() {
    await togglePersonActive(personId);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Link href={`/personas/${personId}/editar`} className="flex items-center gap-2 w-full">
            <Pencil className="h-4 w-4" />
            Editar
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleToggle}>
          {isActive ? (
            <>
              <UserX className="mr-2 h-4 w-4" />
              Desactivar
            </>
          ) : (
            <>
              <UserCheck className="mr-2 h-4 w-4" />
              Activar
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
