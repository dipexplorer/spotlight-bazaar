import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spotlight Bazaar | India's Open Business Street",
  description: "Discover curated local wedding photographers, cafes, freelancers, and businesses across India on an open interactive map.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://spotlightbazaar.com"),
  openGraph: {
    title: "Spotlight Bazaar | India's Open Business Street",
    description: "Discover verified local businesses, explore rates, and connect instantly on WhatsApp.",
    siteName: "Spotlight Bazaar",
    locale: "en_IN",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] text-neutral-100 antialiased selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}

