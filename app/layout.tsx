import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { JsonLd } from "@/components/json-ld";
import { BRAND, siteUrl } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${BRAND.name}: stop getting ghosted by employers`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    "New UK and US roles the hour they go live on the company's own careers page, so you're one of the first to apply. Stop applying into silence.",
  openGraph: { siteName: BRAND.name, type: "website", locale: "en_GB" },
  twitter: { card: "summary_large_image" },
  // Search Console and Bing Webmaster Tools ownership tags, set in Vercel.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

const SITE_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl()}/#org`,
      name: BRAND.name,
      url: siteUrl(),
      logo: `${siteUrl()}/icon.svg`,
      email: BRAND.supportEmail,
      description:
        "Ghostless sends job seekers new UK and US roles the hour they go live on the company's own careers page, so they can apply before the crowd.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl()}/#site`,
      name: BRAND.name,
      url: siteUrl(),
      inLanguage: "en-GB",
      publisher: { "@id": `${siteUrl()}/#org` },
    },
  ],
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <JsonLd data={SITE_LD} />
        {children}
      </body>
    </html>
  );
}
