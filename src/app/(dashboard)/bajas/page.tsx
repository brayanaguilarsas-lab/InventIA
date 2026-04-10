'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logAuditClient } from '@/lib/audit-client';

interface RetirementRow {
  id: string;
  reason: string;
  description: string;
  final_destination: string;
  retired_at: string;
  asset: { id: string; name: string; code: string } | null;
}

interface AssetOption {
  id: string;
  name: string;
  code: string;
  status: string;
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

export default function RetirementPage() {
  const [retirements, setRetirements] = useState<RetirementRow[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    asset_id: '',
    reason: '',
    description: '',
    final_destination: '',
  });

  async function loadData() {
    const supabase = createClient();
    const [rRes, aRes] = await Promise.all([
      supabase
        .from('asset_retirements')
        .select('*, asset:assets(id, name, code)')
        .order('retired_at', { ascending: false }),
      supabase
        .from('assets')
        .select('id, name, code, status')
        .neq('status', 'baja'),
    ]);
    setRetirements((rRes.data ?? []) as RetirementRow[]);
    setAssets((aRes.data ?? []) as AssetOption[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // If asset is assigned, close the assignment first
      const selectedAsset = assets.find((a) => a.id === form.asset_id);
      if (selectedAsset?.status === 'asignado') {
        const { data: activeAssignment } = await supabase
          .from('assignments')
          .select('id')
          .eq('asset_id', form.asset_id)
          .eq('is_active', true)
          .single();
        if (activeAssignment) {
          await supabase.from('assignments').update({
            returned_at: new Date().toISOString(),
            return_condition: 'bueno',
            is_active: false,
          }).eq('id', activeAssignment.id);
        }
      }

      await supabase.from('asset_retirements').insert({
        ...form,
        authorized_by: user?.id,
        registered_by: user?.id,
      });
      await supabase.from('assets').update({ status: 'baja' }).eq('id', form.asset_id);
      await logAuditClient('dar_baja_activo', 'asset_retirements', form.asset_id, {
        reason: form.reason,
        final_destination: form.final_destination,
      });

      setOpen(false);
      setForm({ asset_id: '', reason: '', description: '', final_destination: '' });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bajas de Activos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={<Button variant="destructive"><Plus className="mr-2 h-4 w-4" />Dar de Baja</Button>}
          />
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
                <Select value={form.asset_id} onValueChange={(v) => { if (v) setForm((p) => ({ ...p, asset_id: v })); }}>
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
                <Select value={form.reason} onValueChange={(v) => { if (v) setForm((p) => ({ ...p, reason: v })); }}>
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
                <Select value={form.final_destination} onValueChange={(v) => { if (v) setForm((p) => ({ ...p, final_destination: v })); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar destino" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desechado">Desechado</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                    <SelectItem value="donado">Donado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="destructive" disabled={loading || !form.asset_id || !form.reason || !form.final_destination}>
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
