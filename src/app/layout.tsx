import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1F4E79" },
    { media: "(prefers-color-scheme: dark)", color: "#1F4E79" },
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
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/icons/icon-512x512.png", color: "#1F4E79" },
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
        url: "/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "Smart Ride Uganda",
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "Smart Ride - Multi-Service Mobility Platform",
    description: "Uganda's premier mobility platform for rides, food delivery, shopping, and more.",
    images: ["/icons/og-image.png"],
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
        <meta name="msapplication-TileColor" content="#1F4E79" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://firebase.googleapis.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
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
