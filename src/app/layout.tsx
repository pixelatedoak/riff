import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from '@/app/service-worker-register'
import "./globals.css";

export const metadata: Metadata = {
  title: { default: 'Riff', template: '%s · Riff' },
  applicationName: 'Riff',
  description: 'A social space for ideas worth building on.',
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
  themeColor: '#0b0b10',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
