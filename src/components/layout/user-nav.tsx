'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Hint } from '@/components/ui/hint';
import { LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { titleCase } from '@/lib/format';

type Theme = 'light' | 'dark' | 'system';

interface UserNavProps {
  email: string;
  fullName: string;
}

export function UserNav({ email, fullName }: UserNavProps) {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      return (localStorage.getItem('theme') as Theme | null) ?? 'system';
    } catch {
      return 'system';
    }
  });

  function setAppliedTheme(next: Theme) {
    setTheme(next);
    try {
      if (next === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
      const isDark =
        next === 'dark' ||
        (next === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    } catch {}
  }

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    router.push('/login');
    router.refresh();
  }

  const displayName = titleCase(fullName);
  const initials =
    displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <DropdownMenu>
      <Hint label="Cuenta y preferencias" description="Tema, cerrar sesión" side="right">
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent transition-colors"
              aria-label="Menú de cuenta"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium truncate">{displayName}</span>
                <span className="text-[10px] text-muted-foreground truncate">{email}</span>
              </div>
            </button>
          }
        />
      </Hint>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setAppliedTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Tema claro
          {theme === 'light' && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAppliedTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Tema oscuro
          {theme === 'dark' && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setAppliedTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          Según sistema
          {theme === 'system' && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
