'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  linkToHome?: boolean;
  variant?: 'light' | 'dark';
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
  linkToHome = true,
  variant = 'light',
}: LogoProps) {
  const { height, width } = sizeMap[size];
  
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#191c1d]';
  const glowColor = variant === 'dark' ? '0 8px 32px rgba(0, 255, 136, 0.2)' : '0 4px 12px rgba(0, 95, 58, 0.15)';
  
  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="relative flex items-center justify-center overflow-hidden rounded-xl shadow-lg"
        style={{ 
          width: width, 
          height: height,
          boxShadow: glowColor
        }}
      >
        <Image
          src="/icon.png"
          alt="Smart Ride Logo"
          width={width}
          height={height}
          className="object-cover"
          priority
        />
      </div>
      {showText && (
        <span className={`text-xl font-bold ${textColor} tracking-tight font-[family-name:var(--font-plus-jakarta)]`}>
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
