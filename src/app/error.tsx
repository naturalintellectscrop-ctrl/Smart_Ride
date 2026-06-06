'use client';

import { useEffect } from 'react';

/**
 * Global Error Boundary — Next.js convention.
 *
 * Catches runtime errors that escape component trees and displays
 * a user-friendly error page instead of a blank screen.
 * The "Try Again" button calls Next.js router refresh.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console (replace with error reporting service in production)
    console.error('[SmartRide] Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0D0D12] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>

        {/* Description */}
        <p className="text-gray-400 mb-6">
          An unexpected error occurred. Please try again or refresh the page.
        </p>

        {/* Error details (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-[#13131A] border border-red-500/20 rounded-xl text-left overflow-auto max-h-40">
            <p className="text-red-400 text-xs font-mono whitespace-pre-wrap">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-gradient-to-r from-[#00FF88] to-[#00CC6E] text-[#0D0D12] px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#00FF88]/30 transition-all duration-300"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="bg-[#13131A] border border-white/10 text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#1A1A24] transition-all duration-300"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
