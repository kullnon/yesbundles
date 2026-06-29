"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// Google AdSense loader. Pro app routes (/apps/*) are paid content and must
// NOT carry ads, so we omit the script entirely on those paths.
export function AdSense() {
  const pathname = usePathname();
  if (pathname?.startsWith("/apps")) return null;

  return (
    <Script
      id="adsbygoogle-init"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6610691391899378"
    />
  );
}
