import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de uso da Elite Champions League",
};

export default function TermsPage() {
  return (
    <div className="container-ecl py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-display text-4xl font-bold uppercase tracking-tight text-paper">
          Termos de Uso
        </h1>
        <p className="mb-8 text-sm text-muted">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="space-y-6 text-sm text-muted">
          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao acessar e utilizar a plataforma Elite Champions League ("ECL"), você concorda em cumprir 
              e estar vinculado a estes Termos de Uso. Se você não concordar com estes termos, não utilize nossos serviços.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              2. Descrição do Serviço
            </h2>
            <p className="mb-2">
              A ECL é uma plataforma digital que oferece:
            </p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Organização e gerenciamento de torneios de Standoff 2</li>
              <li>Sistema de inscrição e gerenciamento de equipes</li>
              <li>Rankings e estatísticas de jogadores e equipes</li>
              <li>Acompanhamento de partidas ao vivo</li>
              <li>Comunicados e notícias oficiais</li>
            </ul>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              3. Cadastro e Conta de Usuário
            </h2>
            <div className="space-y-3">
              <p>
                <strong className="text-paper">3.1</strong> Para utilizar determinados recursos, você deve criar uma conta 
                fornecendo informações precisas, completas e atualizadas.
              </p>
              <p>
                <strong className="text-paper">3.2</strong> Você é responsável por manter a confidencialidade de sua senha 
                e por todas as atividades realizadas em sua conta.
              </p>
              <p>
                <strong className="text-paper">3.3</strong> Você deve ter pelo menos 13 anos de idade para criar uma conta.
              </p>
              <p>
                <strong className="text-paper">3.4</strong> É proibido criar múltiplas contas para a mesma pessoa ou equipe.
              </p>
            </div>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              4. Conduta do Usuário
            </h2>
            <p className="mb-2">Ao usar a ECL, você concorda em NÃO:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Violar qualquer lei aplicável ou os direitos de terceiros</li>
              <li>Usar hacks, cheats, exploits ou qualquer software de trapaça</li>
              <li>Manipular resultados, fazer match-fixing ou apostas ilegais</li>
              <li>Assediar, ameaçar, intimidar ou ofender outros usuários</li>
              <li>Publicar conteúdo ofensivo, discriminatório ou ilegal</li>
              <li>Fazer spam, phishing ou distribuir malware</li>
              <li>Tentar acessar contas ou sistemas sem autorização</li>
              <li>Usar a plataforma para fins comerciais não autorizados</li>
            </ul>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              5. Propriedade Intelectual
            </h2>
            <div className="space-y-3">
              <p>
                <strong className="text-paper">5.1</strong> Todo o conteúdo da ECL (textos, gráficos, logos, ícones, código) 
                é propriedade da Elite Champions League ou de seus licenciadores.
              </p>
              <p>
                <strong className="text-paper">5.2</strong> Você recebe uma licença limitada para usar a plataforma 
                para fins pessoais e não comerciais.
              </p>
              <p>
                <strong className="text-paper">5.3</strong> Ao enviar conteúdo (logos, imagens, textos), você garante 
                que possui os direitos necessários e concede à ECL uma licença para usar esse conteúdo.
              </p>
            </div>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              6. Torneios e Competições
            </h2>
            <div className="space-y-3">
              <p>
                <strong className="text-paper">6.1</strong> A participação em torneios está sujeita às Regras Oficiais da ECL.
              </p>
              <p>
                <strong className="text-paper">6.2</strong> A ECL reserva-se o direito de desqualificar equipes ou jogadores 
                que violem as regras.
              </p>
              <p>
                <strong className="text-paper">6.3</strong> As decisões dos árbitros e da organização são finais.
              </p>
              <p>
                <strong className="text-paper">6.4</strong> A ECL pode cancelar ou modificar torneios a qualquer momento, 
                com aviso prévio quando possível.
              </p>
            </div>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              7. Isenção de Garantias
            </h2>
            <p>
              A plataforma é fornecida "como está" e "conforme disponível". Não garantimos que o serviço será 
              ininterrupto, livre de erros ou totalmente seguro. Você usa a plataforma por sua conta e risco.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              8. Limitação de Responsabilidade
            </h2>
            <p>
              Na máxima extensão permitida por lei, a ECL não será responsável por danos indiretos, incidentais, 
              especiais, consequenciais ou punitivos decorrentes do uso ou incapacidade de usar nossos serviços.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              9. Suspensão e Encerramento
            </h2>
            <div className="space-y-3">
              <p>
                <strong className="text-paper">9.1</strong> Podemos suspender ou encerrar sua conta imediatamente 
                se você violar estes Termos de Uso ou as Regras Oficiais.
              </p>
              <p>
                <strong className="text-paper">9.2</strong> Você pode encerrar sua conta a qualquer momento 
                entrando em contato conosco.
              </p>
              <p>
                <strong className="text-paper">9.3</strong> Após o encerramento, algumas informações podem ser 
                mantidas conforme exigido por lei ou fins legítimos.
              </p>
            </div>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              10. Modificações dos Termos
            </h2>
            <p>
              Podemos modificar estes Termos de Uso a qualquer momento. Alterações significativas serão comunicadas 
              através do site ou por e-mail. O uso continuado da plataforma após alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              11. Lei Aplicável
            </h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será 
              resolvida nos tribunais brasileiros.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              12. Contato
            </h2>
            <p className="mb-3">Para questões sobre estes Termos de Uso:</p>
            <ul className="ml-6 space-y-1">
              <li>📧 E-mail: <strong className="text-gold">legal@ecl.gg</strong></li>
              <li>📧 E-mail geral: contato@ecl.gg</li>
            </ul>
          </section>

          <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 text-xs">
            <p className="font-semibold text-gold">Nota Legal:</p>
            <p className="mt-2">
              Ao usar a Elite Champions League, você reconhece que leu, compreendeu e concorda em estar 
              vinculado a estes Termos de Uso e à nossa Política de Privacidade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
