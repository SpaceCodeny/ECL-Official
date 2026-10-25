import type { Metadata } from "next";
import { Trophy, Target, Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre a ECL",
  description: "Conheça a Elite Champions League - A plataforma oficial de torneios competitivos de Standoff 2",
};

export default function AboutPage() {
  return (
    <div className="container-ecl py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-display text-4xl font-bold uppercase tracking-tight text-paper">
          Sobre a ECL
        </h1>
        <p className="mb-12 text-lg text-muted">
          A Elite Champions League é a plataforma oficial de torneios competitivos de Standoff 2
        </p>

        <div className="space-y-8">
          {/* Nossa História */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              Nossa História
            </h2>
            <div className="space-y-4 text-sm text-muted">
              <p>
                Fundada com a missão de elevar o cenário competitivo de Standoff 2, a Elite Champions League 
                nasceu da paixão de jogadores que queriam mais do que partidas casuais — queriam uma plataforma 
                profissional, organizada e justa para competir.
              </p>
              <p>
                Desde nosso primeiro torneio, crescemos exponencialmente, reunindo equipes de todo o Brasil 
                e proporcionando uma experiência competitiva de alto nível. Nossa plataforma digital foi 
                desenvolvida para oferecer transparência, acessibilidade e facilidade de gerenciamento para 
                jogadores, equipes e organizadores.
              </p>
              <p className="font-display text-base font-bold uppercase tracking-wide text-gold">
                The Road to Glory
              </p>
            </div>
          </section>

          {/* Nossos Valores */}
          <section className="card-ecl p-6">
            <h2 className="mb-6 font-display text-2xl font-bold uppercase text-gold">
              Nossos Valores
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                  <Trophy className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-sm font-bold uppercase text-paper">
                    Competitividade
                  </h3>
                  <p className="text-xs text-muted">
                    Promovemos um ambiente competitivo justo e equilibrado onde o talento e dedicação são recompensados.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                  <Target className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-sm font-bold uppercase text-paper">
                    Transparência
                  </h3>
                  <p className="text-xs text-muted">
                    Todas as regras, resultados e rankings são públicos e acessíveis para garantir total transparência.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                  <Users className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-sm font-bold uppercase text-paper">
                    Comunidade
                  </h3>
                  <p className="text-xs text-muted">
                    Construímos uma comunidade forte, respeitosa e apaixonada por esports competitivo.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                  <Zap className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="mb-1 font-display text-sm font-bold uppercase text-paper">
                    Inovação
                  </h3>
                  <p className="text-xs text-muted">
                    Investimos continuamente em tecnologia e melhorias para oferecer a melhor experiência possível.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* O que Oferecemos */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              O que Oferecemos
            </h2>
            <div className="space-y-3 text-sm text-muted">
              <div className="flex gap-2">
                <span className="shrink-0 font-bold text-gold">✓</span>
                <p><strong className="text-paper">Torneios Organizados:</strong> Campeonatos com estrutura profissional, desde grupos até finais emocionantes.</p>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 font-bold text-gold">✓</span>
                <p><strong className="text-paper">Sistema de Ranking:</strong> Acompanhe o desempenho das equipes e jogadores através de rankings atualizados.</p>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 font-bold text-gold">✓</span>
                <p><strong className="text-paper">Plataforma Digital:</strong> Gerencie inscrições, acompanhe partidas ao vivo e acesse resultados em tempo real.</p>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 font-bold text-gold">✓</span>
                <p><strong className="text-paper">Suporte Dedicado:</strong> Equipe de moderadores e árbitros para garantir jogos justos e resolver problemas rapidamente.</p>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 font-bold text-gold">✓</span>
                <p><strong className="text-paper">Comunidade Ativa:</strong> Discord, redes sociais e comunicados oficiais para manter todos informados.</p>
              </div>
            </div>
          </section>

          {/* Contato */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              Entre em Contato
            </h2>
            <div className="space-y-3 text-sm text-muted">
              <p>Quer saber mais sobre a ECL ou tem alguma dúvida? Entre em contato:</p>
              <ul className="ml-6 space-y-2">
                <li>📧 <strong className="text-paper">E-mail:</strong> contato@ecl.gg</li>
                <li>📱 <strong className="text-paper">Instagram:</strong> @elitechampionsleague</li>
                <li>💬 <strong className="text-paper">Discord:</strong> [Em breve]</li>
              </ul>
            </div>
          </section>

          {/* CTA */}
          <div className="rounded-lg border border-gold/40 bg-gradient-to-br from-gold/10 to-gold/5 p-6 text-center">
            <h3 className="mb-2 font-display text-xl font-bold uppercase text-gold">
              Pronto para Competir?
            </h3>
            <p className="mb-4 text-sm text-muted">
              Junte-se aos melhores jogadores de Standoff 2 e prove seu valor na arena competitiva.
            </p>
            <a
              href="/tournaments"
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-display text-sm font-bold uppercase text-ink transition-colors hover:bg-gold-light"
            >
              Ver Campeonatos
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
