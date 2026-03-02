import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'BlackieFi - Wealth Management',
  description: 'Institutional-Grade Wealth Management Platform with AI Co-Pilot',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BlackieFi',
  },
  openGraph: {
    title: 'BlackieFi - Wealth Management',
    description: 'Institutional-Grade Wealth Management Platform with AI Co-Pilot',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050505',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
