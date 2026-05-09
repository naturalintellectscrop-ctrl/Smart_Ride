'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  linkToHome?: boolean;
}

const sizeMap = {
  sm: { height: 32, width: 32 },
  md: { height: 40, width: 40 },
  lg: { height: 64, width: 64 },
};

export default function Logo({ 
  size = 'md', 
  showText = true, 
  className = '',
  linkToHome = true 
}: LogoProps) {
  const { height, width } = sizeMap[size];
  
  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="relative flex items-center justify-center overflow-hidden rounded-xl shadow-lg"
        style={{ 
          width: width, 
          height: height,
          boxShadow: '0 8px 32px rgba(0, 255, 136, 0.2)'
        }}
      >
        <Image
          src="/smartride-logo.jpeg"
          alt="Smart Ride Logo"
          width={width}
          height={height}
          className="object-cover"
          priority
        />
      </div>
      {showText && (
        <span className="text-xl font-bold text-white tracking-tight">
          Smart Ride
        </span>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <Link href="/" className="hover:opacity-90 transition-opacity">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
