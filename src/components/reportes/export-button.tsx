'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Hint } from '@/components/ui/hint';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ExportButton() {
  const [loading, setLoading] = useState<'csv' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: 'csv' | 'pdf') {
    setLoading(format);
    setError(null);
    const toastId = toast.loading(
      format === 'csv' ? 'Generando archivo CSV…' : 'Generando reporte PDF…',
      { description: 'Esto puede tardar unos segundos en inventarios grandes.' }
    );
    try {
      const res = await fetch(`/api/reportes/export?format=${format}&t=${Date.now()}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const txt = await res.text();
          msg += ` — ${txt.slice(0, 300)}`;
        } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('El servidor devolvió un archivo vacío');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Inventario_SaleADS_${new Date().toISOString().slice(0, 10)}.${format}`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 100);
      toast.success(format === 'csv' ? 'CSV descargado' : 'PDF descargado', { id: toastId });
    } catch (err) {
      console.error('[Export]', err);
      const msg = err instanceof Error ? err.message : 'Error al exportar';
      setError(msg);
      toast.error('No se pudo exportar', { id: toastId, description: msg.slice(0, 200) });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Hint label="Descargar inventario en CSV" description="Compatible con Excel y Google Sheets">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={loading !== null}
          >
            {loading === 'csv' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Exportar Excel (CSV)
          </Button>
        </Hint>
        <Hint label="Generar reporte PDF" description="Vista impresa del inventario filtrado">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleExport('pdf')}
            disabled={loading !== null}
          >
            {loading === 'pdf' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Exportar PDF
          </Button>
        </Hint>
      </div>
      {error && (
        <Alert variant="destructive" className="max-w-xl">
          <AlertDescription className="break-all">
            <span className="font-semibold">Error al exportar: </span>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
