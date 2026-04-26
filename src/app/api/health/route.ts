import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Health check público (sin auth) para uptime monitors externos.
// No expone datos sensibles. Verifica conectividad a Supabase.
export async function GET() {
  const start = Date.now();
  let supabaseOk = false;
  let supabaseLatencyMs = -1;
  let error: string | null = null;

  try {
    const supabase = await createClient();
    const t0 = Date.now();
    const { error: dbErr } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    supabaseLatencyMs = Date.now() - t0;
    supabaseOk = !dbErr;
    if (dbErr) error = dbErr.message;
  } catch (e) {
    error = e instanceof Error ? e.message : 'unknown';
  }

  const healthy = supabaseOk;
  const totalMs = Date.now() - start;

  return NextResponse.json(
    {
      ok: healthy,
      timestamp: new Date().toISOString(),
      checks: {
        supabase: { ok: supabaseOk, latencyMs: supabaseLatencyMs },
      },
      totalMs,
      ...(error && !healthy ? { error } : {}),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
