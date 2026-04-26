'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAsset } from '@/lib/actions/assets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Category, FieldDefinition } from '@/types/database';
import { humanizeError } from '@/lib/errors';

export function AssetForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    quantity: 1,
    purchase_date: '',
    commercial_value: 0,
    supplier: '',
    has_insurance: false,
    insurer_name: '',
    insurance_start: '',
    insurance_end: '',
    specific_fields: {} as Record<string, unknown>,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [aiAlerts, setAiAlerts] = useState<string[]>([]);

  function handleCategoryChange(categoryId: string) {
    const cat = categories.find((c) => c.id === categoryId);
    setSelectedCategory(cat ?? null);
    setFormData((prev) => ({ ...prev, category_id: categoryId, specific_fields: {} }));
  }

  function handleSpecificFieldChange(fieldName: string, value: unknown) {
    setFormData((prev) => ({
      ...prev,
      specific_fields: { ...prev.specific_fields, [fieldName]: value },
    }));
  }

  async function handleAIExtract() {
    if (files.length === 0) return;
    setExtracting(true);
    setAiAlerts([]);

    try {
      const formDataObj = new FormData();
      files.forEach((file) => formDataObj.append('files', file));
      if (selectedCategory) {
        formDataObj.append('category_id', selectedCategory.id);
        formDataObj.append('fields_schema', JSON.stringify(selectedCategory.fields_schema));
      }

      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        body: formDataObj,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || `Error en la extracción (HTTP ${response.status})`);
      }

      setFormData((prev) => ({
        ...prev,
        name: result.name || prev.name,
        commercial_value: result.commercial_value || prev.commercial_value,
        purchase_date: result.purchase_date || prev.purchase_date,
        supplier: result.supplier || prev.supplier,
        specific_fields: { ...prev.specific_fields, ...result.specific_fields },
      }));

      if (result.category_suggestion && !selectedCategory) {
        const suggestedCat = categories.find(
          (c) => c.name.toLowerCase() === result.category_suggestion.toLowerCase()
        );
        if (suggestedCat) {
          handleCategoryChange(suggestedCat.id);
        }
      }

      if (result.alerts && result.alerts.length > 0) {
        setAiAlerts(result.alerts);
      }
    } catch (err) {
      const msg = humanizeError(err);
      setError(msg || 'Error al extraer datos con IA. Completa los campos manualmente.');
      toast.error('Extracción con IA falló', { description: msg });
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (formData.has_insurance) {
        if (!formData.insurer_name?.trim()) throw new Error('Aseguradora es requerida cuando el activo tiene póliza');
        if (!formData.insurance_start) throw new Error('Fecha de inicio de cobertura es requerida');
        if (!formData.insurance_end) throw new Error('Fecha de fin de cobertura es requerida');
        if (new Date(formData.insurance_end) <= new Date(formData.insurance_start)) {
          throw new Error('La fecha fin de cobertura debe ser posterior al inicio');
        }
      }
      const asset = await createAsset({
        ...formData,
        purchase_date: formData.purchase_date || null,
        supplier: formData.supplier?.trim() || null,
        insurer_name: formData.has_insurance ? formData.insurer_name : null,
        insurance_start: formData.has_insurance ? formData.insurance_start : null,
        insurance_end: formData.has_insurance ? formData.insurance_end : null,
      });
      toast.success('Activo registrado', { description: `Código ${asset.code}` });
      router.push('/activos');
    } catch (err) {
      const msg = humanizeError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const fields = (selectedCategory?.fields_schema ?? []) as FieldDefinition[];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* AI Extraction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Extracción Inteligente con IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Subir archivos (foto, factura, ficha técnica)</Label>
            <Input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              className="mt-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Máximo 3 archivos. La IA extraerá los datos automáticamente.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAIExtract}
            disabled={files.length === 0 || extracting}
          >
            {extracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extrayendo datos...
              </>
            ) : (
              'Extraer datos con IA'
            )}
          </Button>

          {aiAlerts.length > 0 && (
            <Alert>
              <AlertDescription>
                <p className="mb-2 font-medium">Campos que requieren revisión:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {aiAlerts.map((alert, i) => (
                    <li key={i} className="text-sm">{alert}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select value={formData.category_id} onValueChange={(v) => handleCategoryChange(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del activo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: MacBook Pro 14 pulgadas"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Fecha de compra</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData((p) => ({ ...p, purchase_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commercial_value">Valor comercial (COP) *</Label>
              <Input
                id="commercial_value"
                type="number"
                min={0}
                value={formData.commercial_value}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, commercial_value: Number(e.target.value) }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                step={1}
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, quantity: Math.max(1, Number(e.target.value) || 1) }))
                }
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData((p) => ({ ...p, supplier: e.target.value }))}
                placeholder="Tomado de la factura (ej: Apple Colombia S.A.S.)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category-specific fields */}
      {selectedCategory && fields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campos de {selectedCategory.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label>
                    {field.label} {field.required && '*'}
                  </Label>
                  {field.type === 'select' && field.options ? (
                    <Select
                      value={(formData.specific_fields[field.name] as string) ?? ''}
                      onValueChange={(v) => handleSpecificFieldChange(field.name, v ?? '')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Seleccionar ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
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
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              formData.has_insurance ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <Separator className="mb-4" />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Aseguradora</Label>
                  <Input
                    value={formData.insurer_name}
                    onChange={(e) => setFormData((p) => ({ ...p, insurer_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inicio de cobertura</Label>
                  <Input
                    type="date"
                    value={formData.insurance_start}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, insurance_start: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fin de cobertura</Label>
                  <Input
                    type="date"
                    value={formData.insurance_end}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, insurance_end: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar Activo'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
