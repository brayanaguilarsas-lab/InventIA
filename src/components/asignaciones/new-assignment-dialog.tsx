'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAssignment } from '@/lib/actions/assignments';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Hint } from '@/components/ui/hint';
import type { Person } from '@/types/database';
import { humanizeError } from '@/lib/errors';
import { titleCase } from '@/lib/format';

interface AssetOption {
  id: string;
  code: string;
  name: string;
}

export function NewAssignmentDialog({
  assets,
  people,
}: {
  assets: AssetOption[];
  people: Person[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assetId, setAssetId] = useState('');
  const [personId, setPersonId] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId || !personId) return;

    setLoading(true);
    setError('');

    try {
      await createAssignment({ asset_id: assetId, person_id: personId });
      toast.success('Activo asignado correctamente');
      setOpen(false);
      setAssetId('');
      setPersonId('');
      router.refresh();
    } catch (err) {
      const msg = humanizeError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setAssetId('');
      setPersonId('');
      setError('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Hint label="Nueva asignación" description="Selecciona un activo disponible y su responsable">
        <DialogTrigger
          render={<Button><Plus className="mr-2 h-4 w-4" />Nueva Asignación</Button>}
        />
      </Hint>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Asignación de Activo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label>Activo disponible *</Label>
            <Select value={assetId} onValueChange={(v) => setAssetId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar activo" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.code} — {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Persona *</Label>
            <Select value={personId} onValueChange={(v) => setPersonId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar persona" />
              </SelectTrigger>
              <SelectContent>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {titleCase(person.full_name)} — {titleCase(person.area)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !assetId || !personId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                'Asignar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
