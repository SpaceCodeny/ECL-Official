import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regras Oficiais",
  description: "Regras oficiais dos torneios da Elite Champions League",
};

export default function RulesPage() {
  return (
    <div className="container-ecl py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-display text-4xl font-bold uppercase tracking-tight text-paper">
          Regras Oficiais
        </h1>
        <p className="mb-8 text-lg text-muted">
          Normas e diretrizes para participação nos torneios da Elite Champions League
        </p>

        <div className="space-y-8">
          {/* Seção 1 */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              1. Elegibilidade e Inscrição
            </h2>
            <div className="space-y-3 text-sm text-muted">
              <p>
                <strong className="text-paper">1.1</strong> Todos os jogadores devem ter 13 anos ou mais para participar dos torneios.
              </p>
              <p>
                <strong className="text-paper">1.2</strong> Cada equipe deve ter no mínimo 5 jogadores titulares e pode ter até 2 reservas.
              </p>
              <p>
                <strong className="text-paper">1.3</strong> As inscrições devem ser realizadas dentro do prazo estabelecido para cada campeonato.
              </p>
              <p>
                <strong className="text-paper">1.4</strong> Não é permitido o uso de nomes ofensivos, discriminatórios ou que violem direitos autorais.
              </p>
            </div>
          </section>

          {/* Seção 2 */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              2. Formato das Partidas
            </h2>
            <div className="space-y-3 text-sm text-muted">
              <p>
                <strong className="text-paper">2.1</strong> As partidas seguem o formato Best of 1 (BO1), Best of 3 (BO3) ou Best of 5 (BO5) conforme definido pelo campeonato.
              </p>
              <p>
                <strong className="text-paper">2.2</strong> Cada mapa tem duração máxima de 13 rounds por lado (MR13).
              </p>
              <p>
                <strong className="text-paper">2.3</strong> O sistema de picks e bans será realizado antes de cada série.
              </p>
              <p>
                <strong className="text-paper">2.4</strong> Em caso de empate técnico, o mapa decider será jogado.
              </p>
            </div>
          </section>

          {/* Seção 3 */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              3. Conduta e Fair Play
            </h2>
            <div className="space-y-3 text-sm text-muted">
              <p>
                <strong className="text-paper">3.1</strong> Não é permitido o uso de hacks, cheats, exploits ou qualquer tipo de software de terceiros que ofereça vantagem injusta.
              </p>
              <p>
                <strong className="text-paper">3.2</strong> Comportamento tóxico, ofensivo ou discriminatório resultará em punição que pode variar de advertência a banimento permanente.
              </p>
              <p>
                <strong className="text-paper">3.3</strong> Respeite adversários, árbitros e organizadores.
              </p>
              <p>
                <strong className="text-paper">3.4</strong> Match-fixing, apostas e qualquer forma de manipulação de resultados são estritamente proibidos.
              </p>
            </div>
          </section>

          {/* Seção 4 */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              4. Horários e Atrasos
            </h2>
            <div className="space-y-3 text-sm text-muted">
              <p>
                <strong className="text-paper">4.1</strong> As equipes devem estar prontas no horário agendado da partida.
              </p>
              <p>
                <strong className="text-paper">4.2</strong> Tolerância de atraso: 15 minutos. Após esse período, a equipe ausente perderá por W.O.
              </p>
              <p>
                <strong className="text-paper">4.3</strong> Solicitações de remarcação devem ser feitas com antecedência mínima de 24 horas e estão sujeitas à aprovação da organização.
              </p>
            </div>
          </section>

          {/* Seção 5 */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              5. Problemas Técnicos
            </h2>
            <div className="space-y-3 text-sm text-muted">
              <p>
                <strong className="text-paper">5.1</strong> Em caso de problemas técnicos, pause o jogo imediatamente e contate um árbitro.
              </p>
              <p>
                <strong className="text-paper">5.2</strong> Não é permitido pausar o jogo de forma abusiva ou estratégica.
              </p>
              <p>
                <strong className="text-paper">5.3</strong> Se um jogador desconectar, a equipe tem direito a 1 pausa de até 5 minutos para resolver o problema.
              </p>
              <p>
                <strong className="text-paper">5.4</strong> A decisão final sobre reinício de rounds ou partidas cabe à organização.
              </p>
            </div>
          </section>

          {/* Seção 6 */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              6. Penalidades
            </h2>
            <div className="space-y-3 text-sm text-muted">
              <p>
                <strong className="text-paper">6.1</strong> <strong className="text-gold">Advertência:</strong> Primeira infração menor.
              </p>
              <p>
                <strong className="text-paper">6.2</strong> <strong className="text-gold">Perda de rounds/mapas:</strong> Infrações moderadas.
              </p>
              <p>
                <strong className="text-paper">6.3</strong> <strong className="text-gold">Desqualificação:</strong> Infrações graves ou reincidência.
              </p>
              <p>
                <strong className="text-paper">6.4</strong> <strong className="text-gold">Banimento:</strong> Uso de cheats, match-fixing ou conduta extremamente grave.
              </p>
            </div>
          </section>

          {/* Seção 7 */}
          <section className="card-ecl p-6">
            <h2 className="mb-4 font-display text-2xl font-bold uppercase text-gold">
              7. Contato e Suporte
            </h2>
            <div className="space-y-3 text-sm text-muted">
              <p>
                Para dúvidas, suporte ou reportar problemas, entre em contato através de nossos canais oficiais:
              </p>
              <ul className="ml-6 list-disc space-y-2">
                <li>Discord: [A definir]</li>
                <li>E-mail: suporte@ecl.gg</li>
                <li>Instagram: @elitechampionsleague</li>
              </ul>
            </div>
          </section>

          {/* Nota final */}
          <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 text-sm text-muted">
            <p className="font-semibold text-gold">Observação importante:</p>
            <p className="mt-2">
              A organização da Elite Champions League reserva-se o direito de modificar, adicionar ou remover regras a qualquer momento, 
              bem como tomar decisões finais sobre situações não previstas neste documento. Todas as alterações serão comunicadas 
              com antecedência sempre que possível.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
