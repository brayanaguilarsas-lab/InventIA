'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  ArrowLeftRight,
  Wrench,
  XCircle,
  Settings,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { UserNav } from '@/components/layout/user-nav';

const navigation = [
  { name: 'Dashboard', href: '/reportes', icon: LayoutDashboard },
  { name: 'Activos', href: '/activos', icon: Package },
  { name: 'Personas', href: '/personas', icon: Users },
  { name: 'Asignaciones', href: '/asignaciones', icon: ArrowLeftRight },
  { name: 'Mantenimientos', href: '/mantenimientos', icon: Wrench },
  { name: 'Bajas', href: '/bajas', icon: XCircle },
];

const secondaryNavigation = [
  { name: 'Auditoría', href: '/auditoria', icon: ClipboardList },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 px-6">
        <Package className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">SaleADS Inventario</span>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}

        <Separator className="my-4" />

        {secondaryNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 flex items-center justify-between">
        <UserNav />
      </div>
    </aside>
  );
}
