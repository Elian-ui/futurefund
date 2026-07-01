import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FutureFundProvider } from "./context/useFutureFund";
import { CurrencyProvider } from "./context/CurrencyContext";
import Header from "./components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

const title = "FutureFund | High-Yield ROI Investment Platform";
const description =
  "FutureFund is a premier return on investment platform offering structured daily, weekly, and monthly growth plans.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "FutureFund",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "FutureFund high-yield ROI investment platform",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/futurefund-mark.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/futurefund-mark.svg",
    apple: "/futurefund-mark.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <CurrencyProvider>
        <FutureFundProvider>
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          
          {/* Global Footer */}
          <footer className="border-t border-card-border bg-card/20 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-foreground/40">
                &copy; {new Date().getFullYear()} FutureFund Inc. All rights reserved.
              </div>
              <div className="flex gap-4 text-xs text-foreground/50">
                <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-primary transition-colors">Security Disclosure</a>
              </div>
            </div>
          </footer>
        </FutureFundProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
