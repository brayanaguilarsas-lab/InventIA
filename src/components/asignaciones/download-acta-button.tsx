'use client';

import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/hint';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';

export function DownloadActaButton({
  assignmentId,
  tipo,
}: {
  assignmentId: string;
  tipo: 'entrega' | 'devolucion';
}) {
  const label = tipo === 'entrega' ? 'Acta de Entrega' : 'Acta de Devolución';
  const url = `/api/actas/${tipo}?id=${assignmentId}`;

  function handleOpen() {
    const win = window.open(url, '_blank', 'noopener');
    if (!win) {
      toast.error('Pop-up bloqueado', {
        description: 'Permite ventanas emergentes para descargar el acta.',
      });
    }
  }

  return (
    <Hint label={`Descargar ${label}`} description="Se abre en una pestaña nueva">
      <Button variant="ghost" size="sm" onClick={handleOpen} aria-label={`Descargar ${label}`}>
        <FileDown className="h-3 w-3" />
      </Button>
    </Hint>
  );
}
