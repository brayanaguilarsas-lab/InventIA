'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { createAssignment } from '@/lib/actions/assignments';
import { createMaintenance } from '@/lib/actions/maintenances';
import { createRetirement } from '@/lib/actions/retirements';
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
import { toast } from 'sonner';
import type { AssetStatus, RetirementReason, FinalDestination } from '@/types/database';
import { humanizeError } from '@/lib/errors';

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

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('people')
      .select('id, full_name, area')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        if (cancelled) return;
        setPeople((data ?? []) as Array<{ id: string; full_name: string; area: string }>);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personId) return;
    setLoading(true);
    setError('');
    try {
      await createAssignment({ asset_id: assetId, person_id: personId });
      toast.success('Activo asignado — acta enviada por correo');
      setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <Select value={personId} onValueChange={(v) => setPersonId(v ?? '')}>
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
      await createMaintenance({
        asset_id: assetId,
        reason: form.reason,
        description: form.description,
        sent_at: form.sent_at,
      });
      toast.success('Enviado a mantenimiento');
      setOpen(false);
      setForm({ reason: '', description: '', sent_at: new Date().toISOString().split('T')[0] });
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
            <Label>Descripción *</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} required />
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
  const [admins, setAdmins] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [form, setForm] = useState({
    reason: '',
    description: '',
    final_destination: '',
    authorized_by: '',
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .order('full_name')
      .then(({ data }) => {
        if (cancelled) return;
        setAdmins((data ?? []) as Array<{ id: string; full_name: string; email: string }>);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!form.authorized_by) throw new Error('Selecciona quién autoriza la baja');
      await createRetirement({
        asset_id: assetId,
        reason: form.reason as RetirementReason,
        description: form.description,
        final_destination: form.final_destination as FinalDestination,
        authorized_by: form.authorized_by,
      });
      toast.success('Activo dado de baja');
      setOpen(false);
      setForm({ reason: '', description: '', final_destination: '', authorized_by: '' });
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
            <Label>Descripción *</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} required />
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
                  <SelectItem key={a.id} value={a.id}>{a.full_name} ({a.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={loading || !form.reason || !form.final_destination || !form.authorized_by}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Procesando...</> : 'Confirmar Baja'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
