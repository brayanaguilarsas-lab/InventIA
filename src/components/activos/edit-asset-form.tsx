'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateAsset } from '@/lib/actions/assets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Asset, Category, FieldDefinition } from '@/types/database';

export function EditAssetForm({
  asset,
  categories,
}: {
  asset: Asset & { category: Category | null };
  categories: Category[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: asset.name,
    category_id: asset.category_id,
    purchase_date: asset.purchase_date ?? '',
    commercial_value: Number(asset.commercial_value),
    has_insurance: asset.has_insurance,
    insurer_name: asset.insurer_name ?? '',
    insurance_start: asset.insurance_start ?? '',
    insurance_end: asset.insurance_end ?? '',
    specific_fields: (asset.specific_fields ?? {}) as Record<string, unknown>,
  });

  const selectedCategory = categories.find((c) => c.id === formData.category_id);
  const fields = (selectedCategory?.fields_schema ?? []) as FieldDefinition[];

  function handleSpecificFieldChange(fieldName: string, value: unknown) {
    setFormData((prev) => ({
      ...prev,
      specific_fields: { ...prev.specific_fields, [fieldName]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updateAsset(asset.id, {
        ...formData,
        purchase_date: formData.purchase_date || null,
        insurer_name: formData.has_insurance ? formData.insurer_name : null,
        insurance_start: formData.has_insurance ? formData.insurance_start : null,
        insurance_end: formData.has_insurance ? formData.insurance_end : null,
      });
      router.push(`/activos/${asset.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Input value={selectedCategory?.name ?? ''} disabled />
              <p className="text-xs text-muted-foreground">La categoría no se puede cambiar</p>
            </div>
            <div className="space-y-2">
              <Label>Nombre del activo *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de compra</Label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData((p) => ({ ...p, purchase_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor comercial (COP) *</Label>
              <Input
                type="number"
                min={0}
                value={formData.commercial_value}
                onChange={(e) => setFormData((p) => ({ ...p, commercial_value: Number(e.target.value) }))}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category-specific fields */}
      {fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campos de {selectedCategory?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label>{field.label} {field.required && '*'}</Label>
                  {field.type === 'select' && field.options ? (
                    <Select
                      value={(formData.specific_fields[field.name] as string) ?? ''}
                      onValueChange={(v) => v && handleSpecificFieldChange(field.name, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Seleccionar ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={(formData.specific_fields[field.name] as string) ?? ''}
                      onChange={(e) => handleSpecificFieldChange(field.name, e.target.value)}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insurance */}
      <Card>
        <CardHeader>
          <CardTitle>Póliza de Seguro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={formData.has_insurance}
              onCheckedChange={(v) => setFormData((p) => ({ ...p, has_insurance: v }))}
            />
            <Label>¿Tiene póliza de seguro?</Label>
          </div>
          {formData.has_insurance && (
            <>
              <Separator />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Aseguradora</Label>
                  <Input
                    value={formData.insurer_name}
                    onChange={(e) => setFormData((p) => ({ ...p, insurer_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inicio cobertura</Label>
                  <Input
                    type="date"
                    value={formData.insurance_start}
                    onChange={(e) => setFormData((p) => ({ ...p, insurance_start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin cobertura</Label>
                  <Input
                    type="date"
                    value={formData.insurance_end}
                    onChange={(e) => setFormData((p) => ({ ...p, insurance_end: e.target.value }))}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar Cambios'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
