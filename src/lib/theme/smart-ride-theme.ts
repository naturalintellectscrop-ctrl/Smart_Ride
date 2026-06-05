/**
 * Smart Ride Design System Theme Configuration
 * 
 * Updated to match Stitch Visual Design System
 * 
 * Primary Theme: Light mode interface
 * Background: White / Light grey (#f8f9fa, #ffffff)
 * Primary Accent: Deep Green (#005f3a)
 * Secondary Accent: Bright Green (#22C55E)
 * Typography: Plus Jakarta Sans (headlines), Inter (body)
 */

export const smartRideTheme = {
  // ============================================
  // Color Palette - Stitch Design System
  // ============================================
  colors: {
    // Background Colors - Light Mode
    background: {
      base: '#f8f9fa',           // Surface - main background
      elevated: '#ffffff',        // Surface container lowest - cards, panels
      surface: '#f3f4f5',        // Surface container low - inputs, buttons
      overlay: 'rgba(0, 0, 0, 0.4)', // Modal overlays
    },
    
    // Deep Green - Primary Color
    primary: {
      DEFAULT: '#005f3a',
      container: '#0e7a4d',
      onPrimary: '#ffffff',
      onPrimaryContainer: '#a6ffc9',
      fixed: '#98f6be',
      fixedDim: '#7cd9a4',
      onPrimaryFixed: '#002111',
      onPrimaryFixedVariant: '#005231',
    },
    
    // Bright Green - Secondary/Go Color
    green: {
      DEFAULT: '#22C55E',
      bright: '#4ae176',
      muted: '#006e2f',
      container: '#6bff8f',
      onContainer: '#007432',
      glow: 'rgba(0, 95, 58, 0.4)',
      glowIntense: 'rgba(0, 95, 58, 0.6)',
    },
    
    // Tertiary - Slate Grey
    tertiary: {
      DEFAULT: '#4b5264',
      container: '#636a7c',
      onTertiary: '#ffffff',
      onContainer: '#e6ebff',
      fixed: '#dce2f7',
      fixedDim: '#c0c6db',
    },
    
    // Status Colors
    status: {
      active: '#22C55E',        // Bright green - active/online
      success: '#005f3a',       // Deep green - success
      emergency: '#ba1a1a',     // Red - SOS/emergency
      warning: '#F59E0B',       // Orange - warnings
      pending: '#636a7c',       // Slate - pending states
      offline: '#6f7a71',       // Muted green - offline/inactive
    },
    
    // Service Colors (per service type)
    services: {
      boda: {
        primary: '#005f3a',
        gradient: 'from-[#005f3a] to-[#0e7a4d]',
        glow: 'rgba(0, 95, 58, 0.3)',
      },
      car: {
        primary: '#0e7a4d',
        gradient: 'from-[#0e7a4d] to-[#22C55E]',
        glow: 'rgba(14, 122, 77, 0.3)',
      },
      food: {
        primary: '#F97316',
        gradient: 'from-[#F97316] to-[#FB923C]',
        glow: 'rgba(249, 115, 22, 0.3)',
      },
      shopping: {
        primary: '#8B5CF6',
        gradient: 'from-[#8B5CF6] to-[#A78BFA]',
        glow: 'rgba(139, 92, 246, 0.3)',
      },
      item: {
        primary: '#14B8A6',
        gradient: 'from-[#14B8A6] to-[#2DD4BF]',
        glow: 'rgba(20, 184, 166, 0.3)',
      },
      health: {
        primary: '#F43F5E',
        gradient: 'from-[#F43F5E] to-[#FB7185]',
        glow: 'rgba(244, 63, 94, 0.3)',
      },
    },
    
    // Text Colors - Light Mode
    text: {
      primary: '#191c1d',           // On-surface
      secondary: '#3f4941',         // On-surface-variant
      muted: '#6f7a71',             // Outline
      disabled: '#bec9bf',          // Outline-variant
      inverse: '#f0f1f2',          // Inverse-on-surface
    },
    
    // Border Colors - Light Mode
    border: {
      DEFAULT: '#bec9bf',           // Outline-variant
      subtle: '#e1e3e4',            // Surface-variant
      strong: '#6f7a71',            // Outline
      primary: 'rgba(0, 95, 58, 0.3)',
      green: 'rgba(34, 197, 94, 0.3)',
    },
  },
  
  // ============================================
  // Elevation & Shadows (Stitch)
  // ============================================
  elevation: {
    level0: 'none',                              // Floor: Maps
    level1: '0 4px 12px 0 rgba(0, 0, 0, 0.08)', // Floating cards
    level2: '0 8px 32px rgba(0, 0, 0, 0.12)',    // Active/modal
    level3: '0 16px 48px rgba(0, 0, 0, 0.16)',   // High emphasis
  },
  
  // ============================================
  // Glass Morphism Effects (Stitch - Light Mode)
  // ============================================
  glass: {
    default: {
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(0, 95, 58, 0.08)',
      boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.08)',
    },
    elevated: {
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(0, 95, 58, 0.06)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    },
    subtle: {
      background: 'rgba(248, 249, 250, 0.6)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(0, 95, 58, 0.04)',
    },
  },
  
  // ============================================
  // Glow Effects (Stitch - Green based)
  // ============================================
  glow: {
    primary: {
      sm: '0 0 10px rgba(0, 95, 58, 0.2)',
      DEFAULT: '0 0 20px rgba(0, 95, 58, 0.25), 0 0 40px rgba(0, 95, 58, 0.1)',
      lg: '0 0 30px rgba(0, 95, 58, 0.3), 0 0 60px rgba(0, 95, 58, 0.15)',
    },
    green: {
      sm: '0 0 10px rgba(34, 197, 94, 0.2)',
      DEFAULT: '0 0 20px rgba(34, 197, 94, 0.25), 0 0 40px rgba(34, 197, 94, 0.1)',
      lg: '0 0 30px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.15)',
    },
    sos: {
      DEFAULT: '0 0 20px rgba(186, 26, 26, 0.4), 0 0 40px rgba(186, 26, 26, 0.2)',
      pulse: '0 0 30px rgba(186, 26, 26, 0.5), 0 0 60px rgba(186, 26, 26, 0.3)',
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
      timing: 'cubic-bezier(0.33, 1, 0.68, 1)',
    },
    fadeIn: {
      duration: '0.2s',
      timing: 'ease-out',
    },
  },
  
  // ============================================
  // Typography - Stitch Design System
  // ============================================
  typography: {
    fontFamily: {
      headline: 'var(--font-plus-jakarta), system-ui, sans-serif',
      sans: 'var(--font-inter), system-ui, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, monospace',
    },
    fontSize: {
      displayLg: '32px',     // display-lg
      headlineLg: '24px',    // headline-lg
      headlineMd: '20px',    // headline-md
      headlineLgMobile: '22px', // headline-lg-mobile
      bodyLg: '18px',        // body-lg
      bodyMd: '16px',        // body-md
      bodySm: '14px',        // body-sm
      labelLg: '14px',       // label-lg
      labelMd: '12px',       // label-md
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      displayLg: '40px',
      headlineLg: '32px',
      headlineMd: '28px',
      headlineLgMobile: '28px',
      bodyLg: '28px',
      bodyMd: '24px',
      bodySm: '20px',
      labelLg: '20px',
      labelMd: '16px',
    },
    letterSpacing: {
      displayLg: '-0.02em',
      labelLg: '0.02em',
      default: '0',
    },
  },
  
  // ============================================
  // Border Radius - Stitch Design System
  // ============================================
  borderRadius: {
    sm: '0.25rem',       // 4px - small elements
    DEFAULT: '0.5rem',   // 8px - buttons, inputs
    md: '0.75rem',       // 12px - medium cards
    lg: '1rem',          // 16px - large cards
    xl: '1.5rem',        // 24px - bottom sheets
    '2xl': '2rem',       // 32px - hero sections
    full: '9999px',      // Pill shapes
  },
  
  // ============================================
  // Spacing - 4px Baseline Grid
  // ============================================
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    containerMargin: '16px',
    gutter: '12px',
  },
  
  // ============================================
  // Shadows - Stitch Elevation
  // ============================================
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 4px 12px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.12)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.16)',
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
export function getGlowClasses(color: 'primary' | 'green' | 'sos', size: 'sm' | 'default' | 'lg' = 'default') {
  return smartRideTheme.glow[color][size];
}

/**
 * Generate status color with glow
 */
export function getStatusStyle(status: 'active' | 'success' | 'emergency' | 'warning' | 'pending' | 'offline') {
  const color = smartRideTheme.colors.status[status];
  const glowColor = status === 'emergency' ? smartRideTheme.glow.sos.DEFAULT :
                    status === 'active' ? smartRideTheme.glow.green.DEFAULT :
                    status === 'success' ? smartRideTheme.glow.primary.DEFAULT : 'none';
  
  return {
    color,
    boxShadow: glowColor,
  };
}

export default smartRideTheme;
