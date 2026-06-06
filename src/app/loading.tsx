/**
 * Global Loading State — Next.js convention.
 *
 * Shown automatically by Next.js while route segments are loading.
 * Uses the Smart Ride design system (dark background, neon green accents).
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0D0D12] flex items-center justify-center">
      <div className="text-center">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-[#13131A] border-t-[#00FF88] rounded-full animate-spin mx-auto mb-4" />

        {/* Brand */}
        <p className="text-white font-semibold text-lg">Smart Ride</p>
        <p className="text-gray-500 text-sm mt-1">Loading...</p>
      </div>
    </div>
  );
}
