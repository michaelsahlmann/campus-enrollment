import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Campus Michael Sahlmann | Matrículas & Checkouts",
    template: "%s | Campus Michael Sahlmann",
  },
  description:
    "Portal oficial de matriculación, checkout y gestión de accesos para cursos y programas de formación en finanzas e inversiones.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "es_PY",
    siteName: "Campus Michael Sahlmann",
    title: "Campus Michael Sahlmann | Matrículas & Checkouts",
    description:
      "Portal oficial de matriculación y pasarela de pago para el Campus Virtual.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#06080D] text-slate-100 selection:bg-emerald-500/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
