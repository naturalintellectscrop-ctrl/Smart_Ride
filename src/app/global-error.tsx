'use client';

import { useEffect } from 'react';

/**
 * Global Error Boundary — catches errors in the root layout.
 *
 * This is required because error.tsx only catches errors below the root layout.
 * Without this, layout crashes show a blank page or the default Next.js error page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production, this would go to Sentry/Datadog
    console.error('[SmartRide] Global unhandled error:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="h-10 w-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Please try again or refresh the page.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mb-4">
                Error ID: {error.digest}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="bg-[#0e7a4d] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#0a6340] transition-all duration-300"
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="bg-card border border-border text-foreground px-8 py-3 rounded-xl font-semibold hover:bg-muted transition-all duration-300"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
