'use client';

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HintProps {
  /** Texto corto mostrado al hacer hover. */
  label: string;
  /**
   * Texto secundario opcional, en gris debajo del label.
   * Útil para describir un atajo o aclarar una acción.
   */
  description?: string;
  /** Lado donde aparece el tooltip. Default: "top". */
  side?: 'top' | 'bottom' | 'left' | 'right';
  /** Si es false, no envuelve en tooltip — pasa el child tal cual. */
  enabled?: boolean;
  children: React.ReactElement;
}

/**
 * Wrapper minimal alrededor de Tooltip para envolver un botón/ícono con
 * un tooltip sutil. El contenido se mantiene corto (1-2 líneas).
 *
 * Uso:
 *   <Hint label="Editar campos">
 *     <Button variant="ghost" size="sm"><Pencil className="h-3 w-3" /></Button>
 *   </Hint>
 */
export function Hint({
  label,
  description,
  side = 'top',
  enabled = true,
  children,
}: HintProps) {
  if (!enabled) return children;

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>
        <div className="flex flex-col">
          <span>{label}</span>
          {description && (
            <span className="text-[10px] text-background/70 mt-0.5">{description}</span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
