'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Hint } from '@/components/ui/hint';
import { Plus, Loader2 } from 'lucide-react';
import { titleCase } from '@/lib/format';
import { toast } from 'sonner';
import { createRetirement } from '@/lib/actions/retirements';
import { humanizeError } from '@/lib/errors';
import type { RetirementReason, FinalDestination } from '@/types/database';

export interface RetirementRow {
  id: string;
  reason: string;
  description: string;
  final_destination: string;
  retired_at: string;
  asset: { id: string; name: string; code: string } | null;
}

export interface AssetOption {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface AdminOption {
  id: string;
  full_name: string;
  email: string;
}

const reasonLabels: Record<string, string> = {
  dañado: 'Dañado irreparable',
  obsoleto: 'Obsoleto',
  robado: 'Robado',
  perdido: 'Perdido',
  otro: 'Otro',
};

const destinationLabels: Record<string, string> = {
  desechado: 'Desechado',
  vendido: 'Vendido',
  donado: 'Donado',
};

export function RetirementsManager({
  retirements,
  assets,
  admins,
}: {
  retirements: RetirementRow[];
  assets: AssetOption[];
  admins: AdminOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    asset_id: '',
    reason: '',
    description: '',
    final_destination: '',
    authorized_by: '',
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setForm({ asset_id: '', reason: '', description: '', final_destination: '', authorized_by: '' });
      setError('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!form.authorized_by) throw new Error('Selecciona quién autoriza la baja');
      await createRetirement({
        asset_id: form.asset_id,
        reason: form.reason as RetirementReason,
        description: form.description,
        final_destination: form.final_destination as FinalDestination,
        authorized_by: form.authorized_by,
      });

      toast.success('Activo dado de baja');
      setOpen(false);
      setForm({ asset_id: '', reason: '', description: '', final_destination: '', authorized_by: '' });
      router.refresh();
    } catch (err) {
      const msg = humanizeError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bajas de Activos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registro formal de activos dañados, obsoletos, robados o perdidos con su destino final.
          </p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <Hint label="Registrar baja de un activo" description="Requiere motivo, destino y autorización">
            <DialogTrigger
              render={<Button variant="destructive"><Plus className="mr-2 h-4 w-4" />Dar de Baja</Button>}
            />
          </Hint>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dar de Baja un Activo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Activo *</Label>
                <Select value={form.asset_id} onValueChange={(v) => setForm((p) => ({ ...p, asset_id: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar activo" /></SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select value={form.reason} onValueChange={(v) => setForm((p) => ({ ...p, reason: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dañado">Dañado irreparable</SelectItem>
                    <SelectItem value="obsoleto">Obsoleto</SelectItem>
                    <SelectItem value="robado">Robado</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción del evento *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe las circunstancias..."
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Destino final *</Label>
                <Select value={form.final_destination} onValueChange={(v) => setForm((p) => ({ ...p, final_destination: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar destino" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desechado">Desechado</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="donado">Donado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Autorizado por *</Label>
                <Select value={form.authorized_by} onValueChange={(v) => setForm((p) => ({ ...p, authorized_by: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar administrador/a" /></SelectTrigger>
                  <SelectContent>
                    {admins.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{titleCase(a.full_name)} ({a.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="destructive" disabled={loading || !form.asset_id || !form.reason || !form.final_destination || !form.authorized_by}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</> : 'Confirmar Baja'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activos Dados de Baja ({retirements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retirements.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.asset?.code} — {r.asset?.name}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">{reasonLabels[r.reason] ?? r.reason}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{r.description}</TableCell>
                  <TableCell>{destinationLabels[r.final_destination] ?? r.final_destination}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {new Date(r.retired_at).toLocaleDateString('es-CO')}
                  </TableCell>
                </TableRow>
              ))}
              {retirements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay activos dados de baja
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
