import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00FF88" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0D12" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Smart Ride - Multi-Service Mobility Platform",
    template: "%s | Smart Ride",
  },
  description: "Uganda's premier mobility platform for rides, food delivery, shopping, and more. Book Smart Boda, Smart Car, order food, and get items delivered.",
  keywords: [
    "Smart Ride",
    "Uganda",
    "Ride Hailing",
    "Boda Boda",
    "Food Delivery",
    "Shopping Delivery",
    "Transportation",
    "Kampala",
    "MTN MoMo",
    "Airtel Money",
  ],
  authors: [{ name: "Smart Ride Team" }],
  creator: "Smart Ride Uganda",
  publisher: "Smart Ride",
  
  // PWA Configuration
  manifest: "/manifest.json",
  
  // Icons
  icons: {
    icon: [
      { url: "/favicon.jpg", sizes: "any", type: "image/jpeg" },
      { url: "/smartride-logo.jpeg", sizes: "1024x1024", type: "image/jpeg" },
    ],
    apple: [
      { url: "/smartride-logo.jpeg", sizes: "1024x1024", type: "image/jpeg" },
    ],
    other: [
      { rel: "mask-icon", url: "/smartride-logo.jpeg", color: "#00FF88" },
    ],
  },
  
  // Apple PWA Meta
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Smart Ride",
  },
  
  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_UG",
    url: "https://smartride.ug",
    siteName: "Smart Ride",
    title: "Smart Ride - Multi-Service Mobility Platform",
    description: "Uganda's premier mobility platform for rides, food delivery, shopping, and more.",
    images: [
      {
        url: "/smartride-logo.jpeg",
        width: 1024,
        height: 1024,
        alt: "Smart Ride Uganda",
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "Smart Ride - Multi-Service Mobility Platform",
    description: "Uganda's premier mobility platform for rides, food delivery, shopping, and more.",
    images: ["/smartride-logo.jpeg"],
  },
  
  // Additional PWA
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  
  // App Links for deep linking
  alternates: {
    canonical: "https://smartride.ug",
  },
  
  // Other
  applicationName: "Smart Ride",
  category: "transportation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Smart Ride" />
        <meta name="application-name" content="Smart Ride" />
        <meta name="msapplication-TileColor" content="#00FF88" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-TileImage" content="/smartride-logo.jpeg" />
        
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/smartride-logo.jpeg" />
        <link rel="apple-touch-icon" href="/smartride-logo.jpeg" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://firebase.googleapis.com" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
        
        {/* PWA Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration.scope);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
