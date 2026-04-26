'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, Download } from 'lucide-react';
import { bulkImportPeople, type BulkImportRow } from '@/lib/actions/people';

type Row = BulkImportRow;

const HEADERS = ['full_name', 'id_number', 'id_type', 'person_type', 'area', 'position', 'email'] as const;

// Map many possible header names (Spanish/English, with/without accents) to canonical keys
const HEADER_ALIASES: Record<string, (typeof HEADERS)[number]> = {
  // full_name
  'full_name': 'full_name', 'name': 'full_name', 'nombre': 'full_name',
  'nombre completo': 'full_name', 'nombres': 'full_name', 'nombres y apellidos': 'full_name',
  'colaborador': 'full_name', 'empleado': 'full_name', 'persona': 'full_name',
  // id_number
  'id_number': 'id_number', 'id': 'id_number', 'identificacion': 'id_number', 'identificación': 'id_number',
  'cedula': 'id_number', 'cédula': 'id_number', 'documento': 'id_number', 'nro documento': 'id_number',
  'numero documento': 'id_number', 'número documento': 'id_number', 'dni': 'id_number', 'nro identificacion': 'id_number',
  'nro. identificación': 'id_number', 'no. documento': 'id_number', 'no documento': 'id_number',
  // id_type
  'id_type': 'id_type', 'tipo documento': 'id_type', 'tipo de documento': 'id_type',
  'tipo doc': 'id_type', 'tipo id': 'id_type', 'tipo identificacion': 'id_type', 'tipo identificación': 'id_type',
  // person_type
  'person_type': 'person_type', 'tipo': 'person_type', 'tipo persona': 'person_type',
  'tipo de persona': 'person_type', 'vinculo': 'person_type', 'vínculo': 'person_type',
  'vinculación': 'person_type', 'vinculacion': 'person_type', 'contrato': 'person_type',
  'tipo contrato': 'person_type', 'tipo de contrato': 'person_type',
  // area
  'area': 'area', 'área': 'area', 'departamento': 'area', 'depto': 'area', 'equipo': 'area',
  // position
  'position': 'position', 'cargo': 'position', 'puesto': 'position', 'rol': 'position', 'role': 'position',
  // email
  'email': 'email', 'e-mail': 'email', 'correo': 'email', 'correo electronico': 'email',
  'correo electrónico': 'email', 'mail': 'email',
};

function normalizeHeader(h: string): (typeof HEADERS)[number] | null {
  const key = h.trim().toLowerCase().replace(/\s+/g, ' ');
  return HEADER_ALIASES[key] ?? null;
}

function parseCSV(text: string): { rows: Row[]; parseErrors: string[] } {
  const parseErrors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], parseErrors: ['CSV vacío'] };

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };

  const rawHeaders = splitLine(lines[0]);
  const idx: Partial<Record<(typeof HEADERS)[number], number>> = {};
  rawHeaders.forEach((h, i) => {
    const canonical = normalizeHeader(h);
    if (canonical && idx[canonical] === undefined) idx[canonical] = i;
  });

  if (idx.full_name === undefined || idx.id_number === undefined) {
    parseErrors.push(
      'No se pudo identificar las columnas "Nombre" e "Identificación". Asegúrate de que el CSV incluya ambas (puede ser en español: Nombre, Cédula, Documento, etc.).'
    );
    return { rows: [], parseErrors };
  }

  const missing = HEADERS.filter((h) => idx[h] === undefined && h !== 'full_name' && h !== 'id_number');
  if (missing.length > 0) {
    parseErrors.push(
      `Columnas no detectadas (se dejarán vacías / por defecto y deberás completarlas después): ${missing.join(', ')}`
    );
  }

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const pick = (k: (typeof HEADERS)[number]) => (idx[k] !== undefined ? (cols[idx[k]!] ?? '').trim() : '');
    rows.push({
      full_name: pick('full_name'),
      id_number: pick('id_number'),
      id_type: pick('id_type'),
      person_type: pick('person_type'),
      area: pick('area'),
      position: pick('position'),
      email: pick('email'),
    });
  }
  return { rows, parseErrors };
}

function downloadTemplate() {
  const csv =
    HEADERS.join(',') +
    '\n"Juan Pérez","1234567890","CC","empleado","Tecnología","Desarrollador","juan.perez@saleads.com"\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_personas_inventia.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportCsvDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<Awaited<ReturnType<typeof bulkImportPeople>> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setParseErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows: parsedRows, parseErrors: errs } = parseCSV(text);
    setRows(parsedRows);
    setParseErrors(errs);
    setResult(null);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const res = await bulkImportPeople(rows);
      setResult(res);
      router.refresh();
    } catch (err) {
      setParseErrors([err instanceof Error ? err.message : 'Error de importación']);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar personas desde CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Columnas requeridas: <code className="text-xs">full_name, id_number, id_type, person_type, area, position, email</code>
          </div>
          <div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Descargar plantilla
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:opacity-90"
          />

          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                {parseErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && !result && (
            <div className="rounded-md border p-3 text-sm">
              <div className="mb-2 font-medium">Vista previa: {rows.length} fila(s)</div>
              <div className="max-h-48 overflow-y-auto text-xs">
                {rows.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex gap-2 border-b py-1">
                    <span className="font-mono">{r.id_number}</span>
                    <span>{r.full_name}</span>
                    <span className="text-muted-foreground">{r.email}</span>
                  </div>
                ))}
                {rows.length > 5 && (
                  <div className="pt-1 text-muted-foreground">+ {rows.length - 5} más…</div>
                )}
              </div>
            </div>
          )}

          {result && (
            <Alert>
              <AlertDescription>
                <div>
                  <strong>{result.created}</strong> creadas de {result.total}.
                </div>
                {result.skipped.length > 0 && (
                  <div className="mt-1">
                    Saltadas (ya existen): {result.skipped.length}
                    <ul className="ml-4 mt-1 list-disc text-xs">
                      {result.skipped.slice(0, 5).map((s, i) => (
                        <li key={i}>
                          {s.id_number} — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="mt-1 text-destructive">
                    Errores: {result.errors.length}
                    <ul className="ml-4 mt-1 list-disc text-xs">
                      {result.errors.slice(0, 5).map((s, i) => (
                        <li key={i}>
                          {s.id_number} — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cerrar
            </Button>
            {!result && (
              <Button onClick={handleImport} disabled={loading || rows.length === 0}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${rows.length || ''}`
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
