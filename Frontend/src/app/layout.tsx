import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Elite Champions League — The Road to Glory",
    template: "%s · Elite Champions League",
  },
  description:
    "Plataforma oficial de torneios competitivos de Standoff 2. Campeonatos, equipes, partidas e rankings da Elite Champions League.",
  keywords: ["ECL", "Elite Champions League", "Standoff 2", "esports", "torneios", "competitivo"],
  authors: [{ name: "Elite Champions League" }],
  openGraph: {
    title: "Elite Champions League — The Road to Glory",
    description: "Plataforma oficial de torneios competitivos de Standoff 2.",
    type: "website",
    locale: "pt_BR",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${oswald.variable}`}>
      <body className="min-h-screen bg-ink font-sans text-paper antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
