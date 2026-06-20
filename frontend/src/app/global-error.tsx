'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass rounded-xl p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Application Error</h2>
            <p className="text-sm text-muted mb-6">{error.message || 'A critical error occurred'}</p>
            <button
              onClick={() => reset()}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium hover:opacity-90"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
