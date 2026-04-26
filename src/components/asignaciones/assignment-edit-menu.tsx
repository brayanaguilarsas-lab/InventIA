'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteAssignment,
  resendAssignmentEmail,
  updateAssignmentPerson,
} from '@/lib/actions/assignments';
import { togglePersonSpartian } from '@/lib/actions/people';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Hint } from '@/components/ui/hint';
import { MoreHorizontal, Pencil, Trash2, Star, FileText, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errors';
import { titleCase } from '@/lib/format';

interface PersonOption {
  id: string;
  full_name: string;
  area: string;
}

interface Props {
  assignmentId: string;
  assetCode: string;
  assetName: string;
  personId: string;
  personName: string;
  personIsSpartian: boolean;
  people: PersonOption[];
}

export function AssignmentEditMenu({
  assignmentId,
  assetCode,
  assetName,
  personId,
  personName,
  personIsSpartian,
  people,
}: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newPersonId, setNewPersonId] = useState(personId);
  const [loading, setLoading] = useState(false);
  const [editError, setEditError] = useState('');

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!newPersonId || newPersonId === personId) {
      setEditOpen(false);
      return;
    }
    setLoading(true);
    setEditError('');
    try {
      await updateAssignmentPerson(assignmentId, newPersonId);
      toast.success('Asignación actualizada');
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      const msg = humanizeError(err);
      setEditError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSpartian() {
    try {
      const updated = await togglePersonSpartian(personId);
      toast.success(
        updated.is_spartian
          ? `${personName} marcada como Spartian`
          : `Spartian desactivado para ${personName}`
      );
      router.refresh();
    } catch (err) {
      toast.error(humanizeError(err));
    }
  }

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteAssignment(assignmentId);
      toast.success('Asignación eliminada');
      setDeleteOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setLoading(false);
    }
  }

  function downloadActa(tipo: 'normal' | 'spartian') {
    const url = `/api/actas/entrega?id=${assignmentId}&tipo=${tipo}&t=${Date.now()}`;
    const win = window.open(url, '_blank', 'noopener');
    if (!win) {
      toast.error('Pop-up bloqueado', {
        description: 'Permite ventanas emergentes para descargar el acta.',
      });
    }
  }

  async function handleResend() {
    const id = toast.loading('Reenviando acta…');
    try {
      const res = await resendAssignmentEmail(assignmentId);
      if (res.ok) {
        const adjuntos = res.attachmentCount === 2 ? '2 actas' : '1 acta';
        toast.success(`Correo reenviado a ${res.recipient} (${adjuntos})`, { id });
      } else {
        toast.error(res.error ?? 'No se pudo reenviar el correo', { id });
      }
    } catch (err) {
      toast.error(humanizeError(err), { id });
    }
  }

  return (
    <>
      <DropdownMenu>
        <Hint label="Más acciones" description="Editar, reenviar, eliminar">
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="sm" aria-label="Más opciones">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            }
          />
        </Hint>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs">{assetCode}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Modificar persona
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleSpartian}>
              <Star className="mr-2 h-4 w-4" />
              {personIsSpartian ? 'Quitar Spartian' : 'Marcar como Spartian'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleResend}>
              <Mail className="mr-2 h-4 w-4" />
              Reenviar correo {personIsSpartian ? '(2 actas)' : '(acta de entrega)'}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Descargar acta
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => downloadActa('normal')}>
              <FileText className="mr-2 h-4 w-4" />
              Acta de entrega
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => downloadActa('spartian')}>
              <FileText className="mr-2 h-4 w-4" />
              Acta de comodato Spartian
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar asignación
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modificar persona */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificar asignación · {assetCode}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {editError && (
              <Alert variant="destructive">
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            )}
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Responsable actual</p>
              <p className="font-medium">{personName}</p>
            </div>
            <div className="space-y-2">
              <Label>Reasignar a *</Label>
              <Select value={newPersonId} onValueChange={(v) => setNewPersonId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar persona" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {titleCase(p.full_name)} — {titleCase(p.area)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Corrige el responsable sin generar devolución. Queda en auditoría.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !newPersonId || newPersonId === personId}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Eliminar asignación */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta asignación?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará el registro de asignación de <span className="font-medium">{assetName}</span>{' '}
              a <span className="font-medium">{personName}</span>. El activo volverá a estado{' '}
              <span className="font-medium">Disponible</span>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Eliminando...' : 'Sí, eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
