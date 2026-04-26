'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { togglePersonActive } from '@/lib/actions/people';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Hint } from '@/components/ui/hint';
import { MoreHorizontal, UserCheck, UserX, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { humanizeError } from '@/lib/errors';

export function PersonActions({
  personId,
  isActive,
}: {
  personId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleToggle() {
    try {
      const p = await togglePersonActive(personId);
      toast.success(p.is_active ? 'Persona activada' : 'Persona desactivada');
      router.refresh();
    } catch (err) {
      toast.error(humanizeError(err));
    }
  }

  return (
    <>
      <DropdownMenu>
        <Hint label="Más acciones" description="Editar, activar/desactivar">
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" aria-label="Más acciones">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            }
          />
        </Hint>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Link href={`/personas/${personId}/editar`} className="flex items-center gap-2 w-full">
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (isActive) setConfirmOpen(true);
              else handleToggle();
            }}
          >
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar esta persona?</AlertDialogTitle>
            <AlertDialogDescription>
              No podrá recibir nuevas asignaciones. Las asignaciones actuales no se verán afectadas.
              Puedes reactivarla en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle}>Sí, desactivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
