'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPerson } from '@/lib/actions/people';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errors';

export default function NewPersonPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    id_number: '',
    id_type: 'CC' as const,
    person_type: 'empleado' as const,
    area: '',
    position: '',
    email: '',
    is_spartian: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createPerson(formData);
      toast.success('Persona registrada', { description: formData.full_name });
      router.push('/personas');
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
      <h1 className="text-2xl font-semibold">Registrar Nueva Persona</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Datos Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de documento *</Label>
                <Select
                  value={formData.id_type}
                  onValueChange={(v) => {
                    if (v) setFormData((p) => ({ ...p, id_type: v as typeof formData.id_type }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                    <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                    <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                    <SelectItem value="NIT">NIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número de identificación *</Label>
                <Input
                  value={formData.id_number}
                  onChange={(e) => setFormData((p) => ({ ...p, id_number: e.target.value }))}
                  placeholder="Número de documento"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de persona *</Label>
                <Select
                  value={formData.person_type}
                  onValueChange={(v) => {
                    if (v) setFormData((p) => ({
                      ...p,
                      person_type: v as typeof formData.person_type,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empleado">Empleado</SelectItem>
                    <SelectItem value="contratista">Contratista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Área *</Label>
                <Input
                  value={formData.area}
                  onChange={(e) => setFormData((p) => ({ ...p, area: e.target.value }))}
                  placeholder="Departamento o área"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData((p) => ({ ...p, position: e.target.value }))}
                  placeholder="Cargo en la empresa"
                  required
                />
              </div>
              <div className="flex items-center gap-3 md:col-span-2">
                <Switch
                  checked={formData.is_spartian}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, is_spartian: v }))}
                />
                <div>
                  <Label>¿Es Spartian?</Label>
                  <p className="text-xs text-muted-foreground">
                    Si se activa, las entregas usarán acta de comodato Spartian.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar Persona'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
