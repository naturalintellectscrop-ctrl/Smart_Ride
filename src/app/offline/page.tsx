'use client';

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-blue-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You&apos;re Offline
        </h1>
        
        <p className="text-gray-600 mb-6">
          It looks like you&apos;ve lost your internet connection. 
          Please check your network settings and try again.
        </p>
        
        <Button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">
            Smart Ride works offline!
          </h3>
          <p className="text-sm text-blue-700">
            Some features are available offline. Your pending requests will be 
            synced automatically when you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  );
}
