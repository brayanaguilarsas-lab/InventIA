'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { returnAssignment } from '@/lib/actions/assignments';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Undo2, Loader2 } from 'lucide-react';
import type { ReturnCondition } from '@/types/database';

export function AssignmentActions({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [condition, setCondition] = useState<ReturnCondition>('bueno');
  const [damageDescription, setDamageDescription] = useState('');

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await returnAssignment(assignmentId, {
        return_condition: condition,
        damage_description: condition === 'con_daños' ? damageDescription : null,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la devolución');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm"><Undo2 className="mr-2 h-3 w-3" />Devolver</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Devolución</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleReturn} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label>Estado de devolución *</Label>
            <Select value={condition} onValueChange={(v) => { if (v) setCondition(v as ReturnCondition); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bueno">Bueno</SelectItem>
                <SelectItem value="con_daños">Con daños</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {condition === 'con_daños' && (
            <div className="space-y-2">
              <Label>Descripción de daños</Label>
              <Textarea
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                placeholder="Describe los daños o novedades..."
                rows={3}
              />
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Registrar Devolución'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
