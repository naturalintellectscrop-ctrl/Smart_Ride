import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#111827",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://smartride.ug"),
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
  
  // Icons - Smart Ride single mark (map pin + road)
  icons: {
    icon: [
      { url: "/favicon-new.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon-new.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-new.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [
      { url: "/favicon-new.png", sizes: "1024x1024", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/favicon-new.png", color: "#00FF88" },
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
        url: "/smartride-logo-new.png",
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
    images: ["/smartride-logo-new.png"],
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Smart Ride" />
        <meta name="application-name" content="Smart Ride" />
        <meta name="msapplication-TileColor" content="#00FF88" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="msapplication-TileImage" content="/favicon-new.png" />
        
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/favicon-new.png" />
        <link rel="apple-touch-icon" href="/favicon-new.png" />
        <link rel="icon" href="/favicon-new.png" type="image/png" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://firebase.googleapis.com" />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          {children}
        </Providers>
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
