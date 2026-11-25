import type { Metadata, Viewport } from "next";
import { Suspense } from 'react'
import Script from 'next/script'
import { ServiceWorkerRegister } from '@/app/service-worker-register'
import { NavigationProgress } from '@/app/navigation-progress'
import { getSiteUrl } from '@/lib/site-url'
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: 'Riff', template: '%s · Riff' },
  applicationName: 'Riff',
  description: 'A social space for ideas worth building on.',
  openGraph: {
    type: 'website',
    siteName: 'Riff',
    title: 'Riff — Ideas worth building on',
    description: 'Start a thought. Let people branch off and build on it.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Riff — Ideas worth building on' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Riff — Ideas worth building on',
    description: 'Start a thought. Let people branch off and build on it.',
    images: ['/opengraph-image'],
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/riff-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Riff',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#10110e',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body>
        <Script id="riff-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('riff-theme');if(t==='midnight'||t==='plum'||t==='ember')document.documentElement.dataset.theme=t}catch{}" }} />
        <Suspense fallback={null}><NavigationProgress /></Suspense>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
