'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Hint } from '@/components/ui/hint';
import { Plus, Loader2, Pencil, Trash2, GripVertical, X } from 'lucide-react';
import { createCategory, updateCategory, deleteCategory } from '@/lib/actions/categories';
import { humanizeError } from '@/lib/errors';

export interface FieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  required: boolean;
  options?: string[];
}

export interface CategoryRow {
  id: string;
  name: string;
  code_prefix: string;
  fields_schema: FieldDef[];
}

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', code_prefix: '' });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createCategory({
        name: newCategory.name,
        code_prefix: newCategory.code_prefix.toUpperCase(),
        fields_schema: [],
        acta_template: '',
      });
      setCreateOpen(false);
      setNewCategory({ name: '', code_prefix: '' });
      router.refresh();
    } catch (err) {
      setError(humanizeError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError('');
    try {
      await deleteCategory(id);
      router.refresh();
    } catch (err) {
      setDeleteError(humanizeError(err));
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Categorías de Activos</CardTitle>
            <CardDescription>Define las categorías y sus campos específicos</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              render={<Button size="sm"><Plus className="mr-2 h-4 w-4" />Nueva Categoría</Button>}
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Categoría</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Audio y Video"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prefijo del código * (máx. 5 caracteres)</Label>
                  <Input
                    value={newCategory.code_prefix}
                    onChange={(e) =>
                      setNewCategory((p) => ({
                        ...p,
                        code_prefix: e.target.value.toUpperCase().slice(0, 5),
                      }))
                    }
                    placeholder="Ej: AUD"
                    maxLength={5}
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</> : 'Crear Categoría'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {deleteError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Prefijo</TableHead>
                <TableHead>Campos Específicos</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="font-mono">{cat.code_prefix}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {cat.fields_schema.map((field) => (
                        <Badge key={field.name} variant="outline" className="text-xs">
                          {field.label}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </Badge>
                      ))}
                      {cat.fields_schema.length === 0 && (
                        <span className="text-sm text-muted-foreground">Sin campos</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Hint label="Editar campos" description={cat.name}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCategory(cat)}
                          aria-label="Editar campos"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </Hint>
                      <AlertDialog>
                        <Hint label="Eliminar categoría" description="Solo si no tiene activos">
                          <AlertDialogTrigger
                            render={
                              <Button variant="ghost" size="sm" aria-label="Eliminar">
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            }
                          />
                        </Hint>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar &quot;{cat.name}&quot;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Solo se puede eliminar si no tiene activos asociados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(cat.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No hay categorías
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingCategory && (
        <CategoryFieldsEditor
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={() => {
            setEditingCategory(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function CategoryFieldsEditor({
  category,
  onClose,
  onSave,
}: {
  category: CategoryRow;
  onClose: () => void;
  onSave: () => void;
}) {
  const [fields, setFields] = useState<FieldDef[]>(category.fields_schema);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [newField, setNewField] = useState<FieldDef>({
    name: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
  });
  const [optionsText, setOptionsText] = useState('');

  function addField() {
    if (!newField.label.trim()) return;
    const name = newField.label
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    if (!name) {
      setSaveError('La etiqueta debe contener al menos una letra o número.');
      return;
    }
    if (fields.some((f) => f.name === name)) {
      setSaveError(`Ya existe un campo con la etiqueta "${newField.label}".`);
      return;
    }
    if (newField.type === 'select') {
      const opts = optionsText.split(',').map((o) => o.trim()).filter(Boolean);
      if (opts.length === 0) {
        setSaveError('Las listas de opciones requieren al menos un valor.');
        return;
      }
    }
    setSaveError('');

    const field: FieldDef = {
      ...newField,
      name,
      options: newField.type === 'select' ? optionsText.split(',').map((o) => o.trim()).filter(Boolean) : undefined,
    };

    setFields((prev) => [...prev, field]);
    setNewField({ name: '', label: '', type: 'text', required: false, options: [] });
    setOptionsText('');
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      await updateCategory(category.id, { fields_schema: fields });
      onSave();
    } catch (err) {
      setSaveError(humanizeError(err) || 'Error al guardar los campos');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Campos de &quot;{category.name}&quot;</CardTitle>
          <CardDescription>Prefijo: {category.code_prefix}</CardDescription>
        </div>
        <Hint label="Cerrar editor">
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar editor">
            <X className="h-4 w-4" />
          </Button>
        </Hint>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.length > 0 && (
          <div className="space-y-2">
            <Label className="text-muted-foreground">Campos actuales</Label>
            <div className="rounded-md border">
              {fields.map((field, index) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between px-4 py-2 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{field.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({field.type})
                      </span>
                      {field.required && (
                        <Badge variant="outline" className="ml-2 text-xs">requerido</Badge>
                      )}
                      {field.options && field.options.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          [{field.options.join(', ')}]
                        </span>
                      )}
                    </div>
                  </div>
                  <Hint label="Quitar campo" description={field.label}>
                    <Button variant="ghost" size="sm" onClick={() => removeField(index)} aria-label="Quitar campo">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </Hint>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-4">
          <Label className="text-muted-foreground">Agregar campo</Label>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Etiqueta</Label>
              <Input
                value={newField.label}
                onChange={(e) => setNewField((p) => ({ ...p, label: e.target.value }))}
                placeholder="Ej: Marca"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={newField.type}
                onValueChange={(v) => setNewField((p) => ({ ...p, type: (v ?? 'text') as FieldDef['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="select">Lista de opciones</SelectItem>
                  <SelectItem value="date">Fecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2 pb-2">
                <Checkbox
                  checked={newField.required}
                  onCheckedChange={(v) => setNewField((p) => ({ ...p, required: !!v }))}
                />
                <Label className="text-xs">Requerido</Label>
              </div>
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" onClick={addField} disabled={!newField.label.trim()}>
                <Plus className="mr-1 h-3 w-3" />
                Agregar
              </Button>
            </div>
          </div>
          {newField.type === 'select' && (
            <div className="space-y-1">
              <Label className="text-xs">Opciones (separadas por coma)</Label>
              <Input
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Ej: Excelente, Bueno, Regular, Malo"
              />
            </div>
          )}
        </div>

        <Separator />

        {saveError && (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : 'Guardar Campos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
