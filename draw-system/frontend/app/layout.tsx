import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
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
    default: "ECL Draw System — Sistema de Sorteios",
    template: "%s · ECL Draw System",
  },
  description:
    "Sistema profissional de sorteios para torneios de eSports com segurança criptográfica e efeitos visuais inspirados em CS2.",
  keywords: ["ECL", "Elite Champions League", "sorteio", "draw", "esports", "CS2"],
  authors: [{ name: "Elite Champions League" }],
  openGraph: {
    title: "ECL Draw System — Sistema de Sorteios",
    description: "Sistema profissional de sorteios para torneios de eSports.",
    type: "website",
    locale: "pt_BR",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${oswald.variable}`}>
      <body className="min-h-screen bg-ink font-sans text-paper antialiased">
        {children}
      </body>
    </html>
  );
}
