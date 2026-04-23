import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/header';
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
      <body className="min-h-screen antialiased">
        <Header />
        <main>{children}</main>
        <BundleDrawer />
        <MobileFAB />
      </body>
    </html>
  );
}
