'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet } from 'lucide-react';

export function ExportButton() {
  function handleExport(status?: string) {
    const params = new URLSearchParams({ format: 'csv' });
    if (status) params.set('status', status);
    window.open(`/api/reportes/export?${params.toString()}`, '_blank');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport()}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Todo el inventario
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('disponible')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Solo disponibles
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('asignado')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Solo asignados
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('mantenimiento')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          En mantenimiento
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
