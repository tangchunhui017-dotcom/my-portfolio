'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
                    <h2 style={{ color: '#dc2626' }}>Something went wrong</h2>
                    <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                        {error.message ?? 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                        }}>
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
