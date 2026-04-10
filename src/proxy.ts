import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const proxyConfig = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (static files, images, chunks, etc.)
     * - favicon.ico
     * - Static file extensions
     */
    '/((?!_next|favicon\\.ico).*)',
  ],
};
