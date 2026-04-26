'use client';

import { useMemo, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Mail, RotateCcw, Eye, Save, Loader2, Variable } from 'lucide-react';
import { toast } from 'sonner';
import { humanizeError } from '@/lib/errors';
import { renderTemplate, type TemplateKey, type TemplateRecord } from '@/lib/templates-shared';
import { resetTemplate, updateTemplate } from '@/lib/actions/templates';

const SAMPLE_VARS: Record<string, string> = {
  personName: 'María Fernanda Pérez',
  personIdType: 'CC',
  personIdNumber: '1.020.345.678',
  assetCode: 'TEC-2026-001',
  assetName: 'MacBook Pro 14"',
  date: new Date().toLocaleDateString('es-CO'),
  condition: 'Bueno — Sin novedades',
};

export function FormatsManager({ templates }: { templates: TemplateRecord[] }) {
  const [items, setItems] = useState(templates);
  const [active, setActive] = useState<TemplateKey>(templates[0]?.key ?? 'email_entrega');

  function handleSaved(updated: TemplateRecord) {
    setItems((prev) => prev.map((t) => (t.key === updated.key ? updated : t)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formatos</CardTitle>
        <CardDescription>
          Plantillas de los correos y de los textos clave que aparecen en las actas PDF.
          Los cambios se aplican automáticamente al siguiente envío.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={active} onValueChange={(v) => setActive(v as TemplateKey)}>
          <TabsList className="flex flex-wrap gap-1">
            {items.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-2">
                {t.category === 'email' ? <Mail className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                {shortName(t.name)}
                {!t.is_default && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />}
              </TabsTrigger>
            ))}
          </TabsList>

          {items.map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-6">
              <TemplateEditor template={t} onSaved={handleSaved} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function shortName(name: string) {
  return name.replace(/^Email — |^PDF — /, '');
}

function TemplateEditor({
  template,
  onSaved,
}: {
  template: TemplateRecord;
  onSaved: (t: TemplateRecord) => void;
}) {
  const [subject, setSubject] = useState(template.subject ?? '');
  const [body, setBody] = useState(template.body);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  const dirty = subject !== (template.subject ?? '') || body !== template.body;

  const previewSubject = useMemo(
    () => (template.category === 'email' ? renderTemplate(subject, SAMPLE_VARS) : ''),
    [subject, template.category]
  );
  const previewBody = useMemo(() => renderTemplate(body, SAMPLE_VARS), [body]);

  function insertVar(name: string) {
    const placeholder = `{{${name}}}`;
    setBody((prev) => prev + placeholder);
  }

  function handleSave() {
    setError('');
    start(async () => {
      try {
        const updated = await updateTemplate(template.key, {
          subject: template.category === 'email' ? subject : null,
          body,
        });
        onSaved(updated);
        toast.success('Plantilla guardada — los próximos envíos usarán esta versión');
      } catch (err) {
        const msg = humanizeError(err);
        setError(msg);
        toast.error(msg);
      }
    });
  }

  function handleReset() {
    setError('');
    start(async () => {
      try {
        const updated = await resetTemplate(template.key);
        onSaved(updated);
        setSubject(updated.subject ?? '');
        setBody(updated.body);
        toast.success('Plantilla restaurada al texto por defecto');
      } catch (err) {
        const msg = humanizeError(err);
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">{template.name}</h3>
          <p className="text-sm text-muted-foreground">{template.description}</p>
          {!template.is_default && template.updated_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              Editado {new Date(template.updated_at).toLocaleString('es-CO')}
            </p>
          )}
        </div>
        <Badge variant="outline" className={template.is_default ? '' : 'border-primary text-primary'}>
          {template.is_default ? 'Por defecto' : 'Personalizado'}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="space-y-3">
          {template.category === 'email' && (
            <div className="space-y-1.5">
              <Label htmlFor={`subject-${template.key}`}>Asunto del correo</Label>
              <Input
                id={`subject-${template.key}`}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Asunto…"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`body-${template.key}`}>
              {template.category === 'email' ? 'Cuerpo del correo (HTML)' : 'Texto del párrafo'}
            </Label>
            <Textarea
              id={`body-${template.key}`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={template.category === 'email' ? 16 : 6}
              className="font-mono text-xs leading-relaxed"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Variable className="h-3.5 w-3.5" />
            Variables disponibles
          </div>
          <div className="rounded-md border bg-muted/30 p-2 space-y-1">
            {template.variables.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => insertVar(v.name)}
                className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                title={v.description}
              >
                <span className="font-mono text-primary">{`{{${v.name}}}`}</span>
                <div className="text-[11px] text-muted-foreground">{v.description}</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Click en una variable para insertarla al final del texto.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview((v) => !v)}
        >
          <Eye className="mr-2 h-3.5 w-3.5" />
          {showPreview ? 'Ocultar vista previa' : 'Ver vista previa'}
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={pending || template.is_default}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Restaurar default
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={pending || !dirty}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Save className="mr-2 h-3.5 w-3.5" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="space-y-2 rounded-md border bg-muted/20 p-4">
          <div className="text-xs font-medium text-muted-foreground">
            Vista previa con datos de ejemplo
          </div>
          {template.category === 'email' ? (
            <>
              <div className="rounded bg-background px-3 py-2 text-sm">
                <span className="text-muted-foreground">Asunto: </span>
                <span className="font-medium">{previewSubject}</span>
              </div>
              <div
                className="rounded border bg-white p-3 text-sm text-black"
                dangerouslySetInnerHTML={{ __html: previewBody }}
              />
            </>
          ) : (
            <div className="rounded border bg-background p-3 text-sm whitespace-pre-wrap">
              {previewBody}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
