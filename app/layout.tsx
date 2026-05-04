import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BundleDrawer } from '@/components/bundle-drawer';
import { MobileFAB } from '@/components/mobile-fab';
export const metadata: Metadata = {
  title: 'YesBundles — Templates, Trackers & Guides',
  description:
    'Build your own bundle of digital PDFs and spreadsheets across career, travel, finance, health, and business. Instant download, lifetime access.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
<head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6610691391899378" crossOrigin="anonymous"></script>
      </head>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6610691391899378" crossOrigin="anonymous"></script>
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <BundleDrawer />
        <MobileFAB />
        <Analytics />
      </body>
    </html>
  );
}
