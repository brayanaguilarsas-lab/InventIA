'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileDown } from 'lucide-react';

export function DownloadActaButton({
  assignmentId,
  tipo,
}: {
  assignmentId: string;
  tipo: 'entrega' | 'devolucion';
}) {
  const label = tipo === 'entrega' ? 'Acta de Entrega' : 'Acta de Devolución';
  const url = `/api/actas/${tipo}?id=${assignmentId}`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(url, '_blank')}
          >
            <FileDown className="h-3 w-3" />
          </Button>
        }
      />
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
