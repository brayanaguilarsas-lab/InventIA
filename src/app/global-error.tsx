'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
          background: '#0a0a0a',
          color: '#fafafa',
          minHeight: '100vh',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '32rem', width: '100%' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#999', marginBottom: '0.5rem' }}>
            {error?.message || 'Error desconocido'}
          </p>
          {error?.digest && (
            <p style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace', marginBottom: '1rem' }}>
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
              href="/login"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #333',
                color: '#fafafa',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Ir al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
