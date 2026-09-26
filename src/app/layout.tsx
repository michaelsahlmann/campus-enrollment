import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Instituto Varkentis | Portal de Matrícula & Checkouts",
    template: "%s | Instituto Varkentis",
  },
  description:
    "Ecosistema para mentes que exigen resultados exponenciales. Portal oficial de matriculación, checkouts y gestión de accesos de Instituto Varkentis.",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "es_PY",
    siteName: "Instituto Varkentis",
    title: "Instituto Varkentis | Portal de Matrícula & Checkouts",
    description:
      "Portal oficial de matriculación y pasarela de pago para el Campus Virtual Instituto Varkentis.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#050505] text-[#d6d6dc] selection:bg-[#F26101]/30 selection:text-white font-body">
        {children}
      </body>
    </html>
  );
}
