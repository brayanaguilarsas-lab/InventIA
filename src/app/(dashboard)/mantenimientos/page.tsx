'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Plus, Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { logAuditClient } from '@/lib/audit-client';

interface MaintenanceRow {
  id: string;
  reason: string;
  description: string;
  sent_at: string;
  returned_at: string | null;
  final_status: string | null;
  asset: { id: string; name: string; code: string } | null;
}

interface AssetOption {
  id: string;
  name: string;
  code: string;
}

export default function MaintenancesPage() {
  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newForm, setNewForm] = useState({
    asset_id: '',
    reason: '',
    description: '',
    sent_at: new Date().toISOString().split('T')[0],
  });

  const [returnForm, setReturnForm] = useState({
    returned_at: new Date().toISOString().split('T')[0],
    final_status: 'funcional',
  });

  async function loadData() {
    const supabase = createClient();
    const [mRes, aRes] = await Promise.all([
      supabase
        .from('maintenances')
        .select('*, asset:assets(id, name, code)')
        .order('created_at', { ascending: false }),
      supabase
        .from('assets')
        .select('id, name, code')
        .in('status', ['disponible', 'asignado']),
    ]);
    setMaintenances((mRes.data ?? []) as MaintenanceRow[]);
    setAssets((aRes.data ?? []) as AssetOption[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('maintenances').insert({
        ...newForm,
        registered_by: user?.id,
      });
      await supabase.from('assets').update({ status: 'mantenimiento' }).eq('id', newForm.asset_id);
      await logAuditClient('enviar_mantenimiento', 'maintenances', newForm.asset_id, { reason: newForm.reason });
      setNewOpen(false);
      setNewForm({ asset_id: '', reason: '', description: '', sent_at: new Date().toISOString().split('T')[0] });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: m } = await supabase.from('maintenances').select('asset_id').eq('id', selectedId).single();
      await supabase.from('maintenances').update(returnForm).eq('id', selectedId);
      if (m) {
        const newStatus = returnForm.final_status === 'funcional' ? 'disponible' : 'disponible';
        await supabase.from('assets').update({ status: newStatus }).eq('id', m.asset_id);
        await logAuditClient('retorno_mantenimiento', 'maintenances', selectedId, { final_status: returnForm.final_status });
      }
      setReturnOpen(false);

      if (returnForm.final_status === 'no_funcional' && m) {
        const goToRetire = confirm(
          'El activo retornó como NO FUNCIONAL. ¿Deseas ir a la página de Bajas para dar de baja este activo?'
        );
        if (goToRetire) {
          window.location.href = '/bajas';
          return;
        }
      }

      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  const pending = maintenances.filter((m) => !m.returned_at);
  const completed = maintenances.filter((m) => m.returned_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mantenimientos</h1>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger
            render={<Button><Plus className="mr-2 h-4 w-4" />Nuevo Mantenimiento</Button>}
          />
          <DialogContent>
            <DialogHeader><DialogTitle>Enviar a Mantenimiento</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label>Activo *</Label>
                <Select value={newForm.asset_id} onValueChange={(v) => { if (v) setNewForm((p) => ({ ...p, asset_id: v })); }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar activo" /></SelectTrigger>
                  <SelectContent>
                    {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Input value={newForm.reason} onChange={(e) => setNewForm((p) => ({ ...p, reason: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={newForm.description} onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de envío *</Label>
                <Input type="date" value={newForm.sent_at} onChange={(e) => setNewForm((p) => ({ ...p, sent_at: e.target.value }))} required />
              </div>
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Enviar a Mantenimiento'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Return Dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Retorno</DialogTitle></DialogHeader>
          <form onSubmit={handleReturn} className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha de retorno *</Label>
              <Input type="date" value={returnForm.returned_at} onChange={(e) => setReturnForm((p) => ({ ...p, returned_at: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Estado final *</Label>
              <Select value={returnForm.final_status} onValueChange={(v) => { if (v) setReturnForm((p) => ({ ...p, final_status: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="funcional">Funcional</SelectItem>
                  <SelectItem value="no_funcional">No funcional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setReturnOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</> : 'Registrar Retorno'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>En Mantenimiento ({pending.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha Envío</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-sm">{m.asset?.code} — {m.asset?.name}</TableCell>
                  <TableCell>{m.reason}</TableCell>
                  <TableCell className="font-mono text-sm">{m.sent_at}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedId(m.id); setReturnOpen(true); }}>
                      <CheckCircle className="mr-2 h-3 w-3" />Retorno
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No hay activos en mantenimiento</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Envío</TableHead>
                <TableHead>Retorno</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completed.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-sm">{m.asset?.code}</TableCell>
                  <TableCell>{m.reason}</TableCell>
                  <TableCell className="font-mono text-sm">{m.sent_at}</TableCell>
                  <TableCell className="font-mono text-sm">{m.returned_at}</TableCell>
                  <TableCell>
                    <Badge variant={m.final_status === 'funcional' ? 'default' : 'destructive'}>
                      {m.final_status === 'funcional' ? 'Funcional' : 'No funcional'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {completed.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin historial</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
