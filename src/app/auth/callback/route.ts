import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function safeNext(raw: string | null): string {
  if (!raw) return '/reportes';
  // Only allow internal paths. Reject protocol-relative (//...), backslash tricks,
  // absolute URLs, and anything not starting with "/".
  if (!raw.startsWith('/')) return '/reportes';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/reportes';
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
