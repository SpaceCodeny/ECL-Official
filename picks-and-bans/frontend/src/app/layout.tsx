import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECL Pick & Ban System",
  description: "Sistema de Pick & Ban em tempo real para treinos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
