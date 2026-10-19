import { Header } from "@/components/navigation/header";
import { Footer } from "@/components/layout/footer";
import { MatchesTicker } from "@/components/home/matches-ticker";

/**
 * Layout público — Header + ticker de partidas + conteúdo + Footer.
 * O ticker fica fixo entre o header e o conteúdo de cada página.
 */
export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <MatchesTicker />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
