/**
 * Smart Ride Design System Theme Configuration
 * 
 * Primary Theme: Dark mode interface
 * Background: Deep charcoal / dark navy (#0D0D12, #1A1A24)
 * Primary Accent: Neon green (#00FF88)
 * Secondary Accent: Electric blue (#3B82F6)
 */

export const smartRideTheme = {
  // ============================================
  // Color Palette
  // ============================================
  colors: {
    // Background Colors
    background: {
      base: '#0D0D12',       // Deep charcoal - main background
      elevated: '#1A1A24',   // Dark navy - cards, panels
      surface: '#252530',    // Slightly lighter - inputs, buttons
      overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
    },
    
    // Neon Green - Primary Accent
    neon: {
      DEFAULT: '#00FF88',
      bright: '#00FF88',
      muted: '#10B981',
      dark: '#059669',
      glow: 'rgba(0, 255, 136, 0.4)',
      glowIntense: 'rgba(0, 255, 136, 0.6)',
    },
    
    // Electric Blue - Secondary Accent
    electric: {
      DEFAULT: '#3B82F6',
      bright: '#60A5FA',
      muted: '#2563EB',
      dark: '#1D4ED8',
      glow: 'rgba(59, 130, 246, 0.4)',
      glowIntense: 'rgba(59, 130, 246, 0.6)',
    },
    
    // Status Colors
    status: {
      active: '#00FF88',      // Green - active/online
      aiMonitoring: '#3B82F6', // Blue - AI features
      emergency: '#EF4444',    // Red - SOS/emergency
      warning: '#F59E0B',      // Orange - warnings
      pending: '#8B5CF6',      // Purple - pending states
      offline: '#6B7280',      // Gray - offline/inactive
    },
    
    // Service Colors (per service type)
    services: {
      boda: {
        primary: '#10B981',
        gradient: 'from-emerald-500 to-teal-600',
        glow: 'rgba(16, 185, 129, 0.4)',
      },
      car: {
        primary: '#3B82F6',
        gradient: 'from-blue-500 to-blue-600',
        glow: 'rgba(59, 130, 246, 0.4)',
      },
      food: {
        primary: '#F97316',
        gradient: 'from-orange-500 to-orange-600',
        glow: 'rgba(249, 115, 22, 0.4)',
      },
      shopping: {
        primary: '#8B5CF6',
        gradient: 'from-purple-500 to-purple-600',
        glow: 'rgba(139, 92, 246, 0.4)',
      },
      item: {
        primary: '#14B8A6',
        gradient: 'from-teal-500 to-teal-600',
        glow: 'rgba(20, 184, 166, 0.4)',
      },
      health: {
        primary: '#F43F5E',
        gradient: 'from-rose-500 to-rose-600',
        glow: 'rgba(244, 63, 94, 0.4)',
      },
    },
    
    // Text Colors
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      muted: 'rgba(255, 255, 255, 0.5)',
      disabled: 'rgba(255, 255, 255, 0.3)',
    },
    
    // Border Colors
    border: {
      DEFAULT: 'rgba(255, 255, 255, 0.08)',
      subtle: 'rgba(255, 255, 255, 0.05)',
      strong: 'rgba(255, 255, 255, 0.15)',
      neon: 'rgba(0, 255, 136, 0.3)',
      electric: 'rgba(59, 130, 246, 0.3)',
    },
  },
  
  // ============================================
  // Glass Morphism Effects
  // ============================================
  glass: {
    default: {
      background: 'rgba(26, 26, 36, 0.8)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    },
    elevated: {
      background: 'rgba(26, 26, 36, 0.9)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5)',
    },
    subtle: {
      background: 'rgba(26, 26, 36, 0.6)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    },
  },
  
  // ============================================
  // Glow Effects
  // ============================================
  glow: {
    neon: {
      sm: '0 0 10px rgba(0, 255, 136, 0.3)',
      DEFAULT: '0 0 20px rgba(0, 255, 136, 0.4), 0 0 40px rgba(0, 255, 136, 0.2)',
      lg: '0 0 30px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 255, 136, 0.3)',
    },
    electric: {
      sm: '0 0 10px rgba(59, 130, 246, 0.3)',
      DEFAULT: '0 0 20px rgba(59, 130, 246, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)',
      lg: '0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(59, 130, 246, 0.3)',
    },
    sos: {
      DEFAULT: '0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.3)',
      pulse: '0 0 30px rgba(239, 68, 68, 0.7), 0 0 60px rgba(239, 68, 68, 0.4)',
    },
  },
  
  // ============================================
  // Animations
  // ============================================
  animations: {
    glowPulse: {
      duration: '2s',
      timing: 'ease-in-out',
      iteration: 'infinite',
    },
    sosPulse: {
      duration: '1.5s',
      timing: 'ease-in-out',
      iteration: 'infinite',
    },
    slideUp: {
      duration: '0.3s',
      timing: 'ease-out',
    },
    fadeIn: {
      duration: '0.2s',
      timing: 'ease-out',
    },
  },
  
  // ============================================
  // Typography
  // ============================================
  typography: {
    fontFamily: {
      sans: 'var(--font-geist-sans), system-ui, sans-serif',
      mono: 'var(--font-geist-mono), monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // ============================================
  // Border Radius
  // ============================================
  borderRadius: {
    sm: '0.375rem',
    DEFAULT: '0.5rem',
    md: '0.625rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  
  // ============================================
  // Shadows
  // ============================================
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    DEFAULT: '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.6)',
  },
} as const;

// ============================================
// Utility Functions
// ============================================

/**
 * Get service color configuration
 */
export function getServiceColors(serviceType: 'boda' | 'car' | 'food' | 'shopping' | 'item' | 'health') {
  return smartRideTheme.colors.services[serviceType];
}

/**
 * Get glass panel classes
 */
export function getGlassClasses(variant: 'default' | 'elevated' | 'subtle' = 'default') {
  const glass = smartRideTheme.glass[variant];
  return {
    background: glass.background,
    backdropFilter: glass.backdropFilter,
    border: glass.border,
    boxShadow: glass.boxShadow,
  };
}

/**
 * Get glow classes for buttons
 */
export function getGlowClasses(color: 'neon' | 'electric' | 'sos', size: 'sm' | 'default' | 'lg' = 'default') {
  return smartRideTheme.glow[color][size];
}

/**
 * Generate status color with glow
 */
export function getStatusStyle(status: 'active' | 'aiMonitoring' | 'emergency' | 'warning' | 'pending' | 'offline') {
  const color = smartRideTheme.colors.status[status];
  const glowColor = status === 'emergency' ? smartRideTheme.glow.sos.DEFAULT :
                    status === 'active' ? smartRideTheme.glow.neon.DEFAULT :
                    status === 'aiMonitoring' ? smartRideTheme.glow.electric.DEFAULT : 'none';
  
  return {
    color,
    boxShadow: glowColor,
  };
}

export default smartRideTheme;
