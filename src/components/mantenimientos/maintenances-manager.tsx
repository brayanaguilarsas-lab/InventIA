'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MaintenanceStatusBadge } from '@/lib/status-badges';
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
import { Plus, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createMaintenance, returnMaintenance } from '@/lib/actions/maintenances';
import { humanizeError } from '@/lib/errors';

export interface MaintenanceRow {
  id: string;
  reason: string;
  description: string;
  sent_at: string;
  returned_at: string | null;
  final_status: string | null;
  asset_id: string;
  asset: { id: string; name: string; code: string } | null;
}

export interface AssetOption {
  id: string;
  name: string;
  code: string;
}

export function MaintenancesManager({
  maintenances,
  assets,
}: {
  maintenances: MaintenanceRow[];
  assets: AssetOption[];
}) {
  const router = useRouter();
  const [newOpen, setNewOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [pendingRetireOpen, setPendingRetireOpen] = useState(false);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createMaintenance({
        asset_id: newForm.asset_id,
        reason: newForm.reason,
        description: newForm.description,
        sent_at: newForm.sent_at,
      });
      toast.success('Activo enviado a mantenimiento');
      setNewOpen(false);
      setNewForm({ asset_id: '', reason: '', description: '', sent_at: new Date().toISOString().split('T')[0] });
      router.refresh();
    } catch (err) {
      const msg = humanizeError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const wasNotFunctional = returnForm.final_status === 'no_funcional';
      await returnMaintenance(selectedId, {
        returned_at: returnForm.returned_at,
        final_status: returnForm.final_status as 'funcional' | 'no_funcional',
      });
      toast.success(
        wasNotFunctional
          ? 'Retorno registrado — activo marcado como no funcional'
          : 'Retorno registrado — activo disponible de nuevo'
      );
      setReturnOpen(false);
      router.refresh();
      if (wasNotFunctional) setPendingRetireOpen(true);
    } catch (err) {
      const msg = humanizeError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function openReturnDialog(maintenanceId: string) {
    setSelectedId(maintenanceId);
    setReturnForm({
      returned_at: new Date().toISOString().split('T')[0],
      final_status: 'funcional',
    });
    setError('');
    setReturnOpen(true);
  }

  const pending = maintenances.filter((m) => !m.returned_at);
  const completed = maintenances.filter((m) => m.returned_at);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mantenimientos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Envía activos a reparación preventiva o correctiva y registra el estado al retorno.
          </p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <Hint label="Enviar activo a mantenimiento" description="Reparación preventiva o correctiva">
            <DialogTrigger
              render={<Button><Plus className="mr-2 h-4 w-4" />Nuevo Mantenimiento</Button>}
            />
          </Hint>
          <DialogContent>
            <DialogHeader><DialogTitle>Enviar a Mantenimiento</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="space-y-2">
                <Label>Activo *</Label>
                <Select value={newForm.asset_id} onValueChange={(v) => setNewForm((p) => ({ ...p, asset_id: v ?? '' }))}>
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

      <AlertDialog open={pendingRetireOpen} onOpenChange={setPendingRetireOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activo retornó NO FUNCIONAL</AlertDialogTitle>
            <AlertDialogDescription>
              El activo quedó marcado como no funcional. ¿Deseas ir a la página de
              Bajas para darlo de baja formalmente (motivo, descripción, destino final y
              autorización)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Más tarde</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/bajas')}>
              Ir a Bajas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <Select value={returnForm.final_status} onValueChange={(v) => setReturnForm((p) => ({ ...p, final_status: v ?? 'funcional' }))}>
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
        <CardHeader>
          <CardTitle>En Mantenimiento ({pending.length})</CardTitle>
          <CardDescription>Pendientes de retorno</CardDescription>
        </CardHeader>
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
                    <Hint label="Registrar retorno" description="Marca como funcional o no funcional">
                      <Button variant="outline" size="sm" onClick={() => openReturnDialog(m.id)}>
                        <CheckCircle className="mr-2 h-3 w-3" />Retorno
                      </Button>
                    </Hint>
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
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Mantenimientos cerrados con su estado final</CardDescription>
        </CardHeader>
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
                    <MaintenanceStatusBadge status={m.final_status} />
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
