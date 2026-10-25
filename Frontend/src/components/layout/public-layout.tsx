import { Header } from "@/components/navigation/header";
import { Footer } from "@/components/layout/footer";

/**
 * Layout público — Header (com ticker integrado) + conteúdo + Footer.
 */
export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
