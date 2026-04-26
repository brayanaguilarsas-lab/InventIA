import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Paleta consistente por estado (funciona en dark y light).
// green: OK/positivo · blue: neutral/info · amber: atención · red: crítico
// Contrastes ajustados para WCAG AA en ambos temas:
// - Dark: subimos opacidad de fondo y aclaramos el texto (300 en vez de 400).
// - Light: bajamos a 800 para mejor contraste sobre 15% bg.
const styles = {
  green: 'bg-green-500/15 dark:bg-green-500/25 text-green-800 dark:text-green-300 border-green-500/30',
  blue: 'bg-blue-500/15 dark:bg-blue-500/25 text-blue-800 dark:text-blue-300 border-blue-500/30',
  amber: 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-800 dark:text-amber-300 border-amber-500/30',
  red: 'bg-red-500/15 dark:bg-red-500/25 text-red-800 dark:text-red-300 border-red-500/30',
  gray: 'bg-muted text-muted-foreground border-border',
};

const assetStatus: Record<string, { label: string; tone: keyof typeof styles }> = {
  disponible: { label: 'Disponible', tone: 'green' },
  asignado: { label: 'Asignado', tone: 'blue' },
  mantenimiento: { label: 'En Mantenimiento', tone: 'amber' },
  baja: { label: 'Dado de Baja', tone: 'red' },
};

export function AssetStatusBadge({ status }: { status: string }) {
  const entry = assetStatus[status] ?? { label: status, tone: 'gray' as const };
  return (
    <Badge variant="outline" className={cn('border', styles[entry.tone])}>
      {entry.label}
    </Badge>
  );
}

const returnCondition: Record<string, { label: string; tone: keyof typeof styles }> = {
  bueno: { label: 'Bueno', tone: 'green' },
  con_daños: { label: 'Con daños', tone: 'amber' },
};

export function ReturnConditionBadge({ condition }: { condition: string | null | undefined }) {
  if (!condition) return <span className="text-muted-foreground text-sm">—</span>;
  const entry = returnCondition[condition] ?? { label: condition, tone: 'gray' as const };
  return (
    <Badge variant="outline" className={cn('border', styles[entry.tone])}>
      {entry.label}
    </Badge>
  );
}

const maintenanceStatus: Record<string, { label: string; tone: keyof typeof styles }> = {
  funcional: { label: 'Funcional', tone: 'green' },
  no_funcional: { label: 'No funcional', tone: 'red' },
};

export function MaintenanceStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-sm">—</span>;
  const entry = maintenanceStatus[status] ?? { label: status, tone: 'gray' as const };
  return (
    <Badge variant="outline" className={cn('border', styles[entry.tone])}>
      {entry.label}
    </Badge>
  );
}
