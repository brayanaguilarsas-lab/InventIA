'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Pencil, ArrowLeftRight, Wrench, XCircle, Loader2 } from 'lucide-react';
import type { AssetStatus } from '@/types/database';

interface AssetActionProps {
  assetId: string;
  status: AssetStatus;
}

export function AssetActions({ assetId, status }: AssetActionProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/activos/${assetId}/editar`}>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-3 w-3" />
          Editar
        </Button>
      </Link>

      {status === 'disponible' && (
        <>
          <QuickAssignDialog assetId={assetId} />
          <QuickMaintenanceDialog assetId={assetId} />
          <QuickRetireDialog assetId={assetId} />
        </>
      )}

      {status === 'asignado' && (
        <QuickMaintenanceDialog assetId={assetId} />
      )}
    </div>
  );
}

function QuickAssignDialog({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [personId, setPersonId] = useState('');
  const [people, setPeople] = useState<Array<{ id: string; full_name: string; area: string }>>([]);

  async function loadPeople() {
    const supabase = createClient();
    const { data } = await supabase
      .from('people')
      .select('id, full_name, area')
      .eq('is_active', true)
      .order('full_name');
    setPeople((data ?? []) as Array<{ id: string; full_name: string; area: string }>);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personId) return;
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('assignments').insert({
        asset_id: assetId,
        person_id: personId,
        assigned_by: user?.id,
      });
      await supabase.from('assets').update({ status: 'asignado' }).eq('id', assetId);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadPeople(); }}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ArrowLeftRight className="mr-2 h-3 w-3" />Asignar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader><DialogTitle>Asignar Activo</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2">
            <Label>Persona *</Label>
            <Select value={personId} onValueChange={(v) => { if (v) setPersonId(v); }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger>
              <SelectContent>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name} — {p.area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !personId}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Asignando...</> : 'Asignar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickMaintenanceDialog({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    reason: '',
    description: '',
    sent_at: new Date().toISOString().split('T')[0],
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('maintenances').insert({
        asset_id: assetId,
        ...form,
        registered_by: user?.id,
      });
      await supabase.from('assets').update({ status: 'mantenimiento' }).eq('id', assetId);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Wrench className="mr-2 h-3 w-3" />Mantenimiento
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader><DialogTitle>Enviar a Mantenimiento</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Fecha de envío *</Label>
            <Input type="date" value={form.sent_at} onChange={(e) => setForm((p) => ({ ...p, sent_at: e.target.value }))} required />
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : 'Enviar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickRetireDialog({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    reason: '',
    description: '',
    final_destination: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('asset_retirements').insert({
        asset_id: assetId,
        ...form,
        authorized_by: user?.id,
        registered_by: user?.id,
      });
      await supabase.from('assets').update({ status: 'baja' }).eq('id', assetId);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            <XCircle className="mr-2 h-3 w-3" />Dar de Baja
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader><DialogTitle>Dar de Baja</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
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
            <Label>Descripción *</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} required />
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
            <Button type="submit" variant="destructive" disabled={loading || !form.reason || !form.final_destination}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</> : 'Confirmar Baja'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
