'use client';

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D12] p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[#00FF88]/10 flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-[#00FF88]" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          You&apos;re Offline
        </h1>

        <p className="text-white/60 mb-6">
          It looks like you&apos;ve lost your internet connection.
          Please check your network settings and try again.
        </p>

        <Button
          onClick={() => window.location.reload()}
          className="bg-[#00FF88] hover:bg-[#00e07a] text-[#0D0D12]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>

        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="font-semibold text-white mb-2">
            Smart Ride works offline!
          </h3>
          <p className="text-sm text-white/60">
            Some features are available offline. Your pending requests will be
            synced automatically when you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  );
}
