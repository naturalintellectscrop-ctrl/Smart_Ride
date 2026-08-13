'use client';

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0C0E] p-4 text-white">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10">
          <WifiOff className="h-9 w-9 text-white/50" />
        </div>

        <h1 className="text-2xl font-semibold text-white">
          You&apos;re offline
        </h1>

        <p className="mt-3 text-white/55">
          It looks like you&apos;ve lost your internet connection.
          Please check your network settings and try again.
        </p>

        <Button
          onClick={() => window.location.reload()}
          className="mt-7 rounded-full bg-white text-[#0B0C0E] hover:bg-white/90"
        >
          <RefreshCw className="size-4" />
          Try again
        </Button>

        <div className="mt-10 rounded-2xl border border-white/10 p-5 text-left">
          <h3 className="font-semibold text-white">
            Smart Ride works offline
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Some features are available offline. Your pending requests will
            be synced automatically once you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  );
}
