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
import type { Asset, Person } from '@/types/database';

export function NewAssignmentDialog({
  assets,
  people,
}: {
  assets: Asset[];
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
      setOpen(false);
      setAssetId('');
      setPersonId('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la asignación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button><Plus className="mr-2 h-4 w-4" />Nueva Asignación</Button>}
      />
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
            <Select value={assetId} onValueChange={(v) => v && setAssetId(v)}>
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
            <Select value={personId} onValueChange={(v) => v && setPersonId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar persona" />
              </SelectTrigger>
              <SelectContent>
                {people.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.full_name} — {person.area}
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
