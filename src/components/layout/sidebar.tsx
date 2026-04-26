'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  ArrowLeftRight,
  Wrench,
  XCircle,
  Settings,
  ClipboardList,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Hint } from '@/components/ui/hint';
import { UserNav } from '@/components/layout/user-nav';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// Activos primero (core del sistema); Dashboard después (resumen).
const navigation: NavItem[] = [
  {
    name: 'Activos',
    href: '/activos',
    icon: Package,
    description: 'Inventario completo de equipos. Crear, editar y consultar activos.',
  },
  {
    name: 'Personas',
    href: '/personas',
    icon: Users,
    description: 'Empleados y contratistas que pueden recibir activos.',
  },
  {
    name: 'Asignaciones',
    href: '/asignaciones',
    icon: ArrowLeftRight,
    description: 'Entrega de activos a personas. Cada entrega genera acta PDF.',
  },
  {
    name: 'Mantenimientos',
    href: '/mantenimientos',
    icon: Wrench,
    description: 'Activos enviados a reparación preventiva o correctiva.',
  },
  {
    name: 'Bajas',
    href: '/bajas',
    icon: XCircle,
    description: 'Activos dados de baja con motivo, destino y autorización.',
  },
  {
    name: 'Dashboard',
    href: '/reportes',
    icon: LayoutDashboard,
    description: 'Resumen ejecutivo, valor del inventario y alertas de pólizas.',
  },
];

const secondaryNavigation: NavItem[] = [
  {
    name: 'Auditoría',
    href: '/auditoria',
    icon: ClipboardList,
    description: 'Bitácora inmutable: quién hizo qué y cuándo.',
  },
  {
    name: 'Configuración',
    href: '/configuracion',
    icon: Settings,
    description: 'Categorías de activos y plantillas de actas/correos.',
  },
];

interface SidebarProps {
  userEmail: string;
  userFullName: string;
}

function SidebarContent({
  onNavigate,
  userEmail,
  userFullName,
}: {
  onNavigate?: () => void;
  userEmail: string;
  userFullName: string;
}) {
  const pathname = usePathname();

  const renderItem = (item: NavItem) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Hint key={item.name} label={item.name} description={item.description} side="right">
        <Link
          href={item.href}
          onClick={onNavigate}
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
      </Hint>
    );
  };

  return (
    <>
      <div className="flex h-16 items-center gap-2 px-6">
        <Package className="h-6 w-6 text-primary" />
        <div className="flex flex-col">
          <span className="text-lg font-semibold leading-none">InventIA</span>
          <span className="text-[10px] text-muted-foreground">Saleads Corp</span>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map(renderItem)}
        <Separator className="my-4" />
        {secondaryNavigation.map(renderItem)}
      </nav>

      <div className="border-t border-border p-3">
        <UserNav email={userEmail} fullName={userFullName} />
      </div>
    </>
  );
}

export function Sidebar({ userEmail, userFullName }: SidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-full w-64 flex-col border-r border-border bg-card">
        <SidebarContent userEmail={userEmail} userFullName={userFullName} />
      </aside>

      {/* Mobile header with hamburger */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold">InventIA</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <Hint label="Abrir menú" side="bottom">
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Abrir menú">
                  <Menu className="h-5 w-5" />
                </Button>
              }
            />
          </Hint>
          <SheetContent side="left" className="p-0 w-64 flex flex-col">
            <SidebarContent
              onNavigate={() => setOpen(false)}
              userEmail={userEmail}
              userFullName={userFullName}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
