'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Stethoscope, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { runAuditDiagnostic, type AuditDiagnostic } from '@/lib/actions/audit';

export function DiagnosticButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<AuditDiagnostic | null>(null);

  function handleRun() {
    setResult(null);
    start(async () => {
      const r = await runAuditDiagnostic();
      setResult(r);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="outline" size="sm" onClick={handleRun} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Ejecutando…
          </>
        ) : (
          <>
            <Stethoscope className="mr-2 h-3.5 w-3.5" />
            Probar registro de auditoría
          </>
        )}
      </Button>

      {result && (
        <Alert variant={result.ok ? 'default' : 'destructive'}>
          <AlertDescription>
            <div className="flex items-start gap-2">
              {result.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div className="space-y-1 text-xs">
                <div>
                  <span className="font-medium">{result.ok ? 'OK' : 'Falló'}:</span>{' '}
                  {result.ok
                    ? `Registro insertado correctamente. Total filas: ${result.totalRows}.`
                    : 'Hay un problema con la auditoría.'}
                </div>
                <div className="font-mono leading-relaxed text-[11px] text-muted-foreground">
                  user_id: {result.userId ?? '∅'} · email: {result.userEmail ?? '∅'} ·
                  user_profile: {result.hasUserProfile ? '✓' : '✗ falta'} ·
                  insert: {result.insertedTestRow ? '✓' : '✗'} ·
                  total: {result.totalRows}
                </div>
                {result.insertError && (
                  <div className="font-mono text-[11px] text-destructive">
                    INSERT: {result.insertError}
                  </div>
                )}
                {result.selectError && (
                  <div className="font-mono text-[11px] text-destructive">
                    SELECT: {result.selectError}
                  </div>
                )}
                {!result.hasUserProfile && (
                  <div className="text-[11px]">
                    Tu usuario no tiene fila en <code>user_profiles</code> — el JOIN de la
                    UI mostrará &quot;Sistema&quot; en la columna Usuario hasta que se cree.
                  </div>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
