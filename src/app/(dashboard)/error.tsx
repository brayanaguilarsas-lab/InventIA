'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.error('[DashboardError]', error);
    }
  }, [error]);

  const message = (() => {
    try {
      return error?.message || 'Error desconocido';
    } catch {
      return 'Error desconocido';
    }
  })();

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '60vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '32rem',
          width: '100%',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border, #333)',
          background: 'var(--card, #111)',
          color: 'var(--card-foreground, #eee)',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Algo salió mal
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground, #aaa)', marginBottom: '0.5rem' }}>
          {message}
        </p>
        {error?.digest && (
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground, #888)', fontFamily: 'monospace', marginBottom: '1rem' }}>
            Ref: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              background: '#fff',
              color: '#000',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Reintentar
          </button>
          <a
            href="/reportes"
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border, #333)',
              color: 'var(--foreground, #eee)',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Ir al dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
