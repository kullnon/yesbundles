import type { Metadata } from 'next';
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
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <BundleDrawer />
        <MobileFAB />
      </body>
    </html>
  );
}
