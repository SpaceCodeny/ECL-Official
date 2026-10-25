import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "LGPD - Lei Geral de Proteção de Dados",
  description: "Informações sobre conformidade com a LGPD na Elite Champions League",
};

export default function LGPDPage() {
  return (
    <div className="container-ecl py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-display text-4xl font-bold uppercase tracking-tight text-paper">
          LGPD
        </h1>
        <p className="mb-8 text-lg text-muted">
          Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)
        </p>

        <div className="space-y-6 text-sm text-muted">
          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Nosso Compromisso com a LGPD
            </h2>
            <p>
              A Elite Champions League ("ECL") está comprometida em proteger a privacidade e os dados pessoais 
              de todos os nossos usuários em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).
            </p>
            <p className="mt-3">
              Esta página complementa nossa{" "}
              <Link href="/privacy" className="font-semibold text-gold hover:text-gold-light">
                Política de Privacidade
              </Link>
              {" "}e fornece informações específicas sobre como cumprimos as obrigações da LGPD.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Base Legal para Tratamento de Dados
            </h2>
            <p className="mb-2">Tratamos seus dados pessoais com base nas seguintes bases legais previstas na LGPD:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong className="text-paper">Consentimento:</strong> Quando você autoriza expressamente o tratamento</li>
              <li><strong className="text-paper">Execução de contrato:</strong> Para fornecer os serviços da plataforma</li>
              <li><strong className="text-paper">Legítimo interesse:</strong> Para melhorar nossos serviços e prevenir fraudes</li>
              <li><strong className="text-paper">Cumprimento de obrigação legal:</strong> Quando exigido por lei</li>
              <li><strong className="text-paper">Proteção ao crédito:</strong> Para processar transações</li>
            </ul>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Seus Direitos Segundo a LGPD
            </h2>
            <p className="mb-3">Como titular de dados pessoais, você tem os seguintes direitos garantidos pela LGPD:</p>
            <div className="space-y-3">
              <div>
                <h3 className="mb-1 font-semibold text-paper">1. Confirmação e Acesso</h3>
                <p>Confirmar se tratamos seus dados e acessar seus dados pessoais.</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-paper">2. Correção</h3>
                <p>Corrigir dados incompletos, inexatos ou desatualizados.</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-paper">3. Anonimização, Bloqueio ou Eliminação</h3>
                <p>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade.</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-paper">4. Portabilidade</h3>
                <p>Receber seus dados em formato estruturado e interoperável para transferência a outro fornecedor.</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-paper">5. Eliminação</h3>
                <p>Solicitar a eliminação de dados tratados com base no consentimento.</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-paper">6. Informação sobre Compartilhamento</h3>
                <p>Obter informações sobre as entidades públicas e privadas com as quais compartilhamos dados.</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-paper">7. Revogação do Consentimento</h3>
                <p>Revogar o consentimento a qualquer momento.</p>
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-paper">8. Oposição</h3>
                <p>Opor-se ao tratamento de dados realizado com dispensa de consentimento.</p>
              </div>
            </div>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Como Exercer Seus Direitos
            </h2>
            <p className="mb-3">
              Para exercer qualquer um dos direitos acima, entre em contato através dos seguintes canais:
            </p>
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
              <p className="mb-2 font-semibold text-gold">Encarregado de Proteção de Dados (DPO)</p>
              <ul className="space-y-1">
                <li>📧 E-mail: <strong className="text-paper">dpo@ecl.gg</strong></li>
                <li>📧 E-mail alternativo: <strong className="text-paper">privacidade@ecl.gg</strong></li>
              </ul>
            </div>
            <p className="mt-3 text-xs">
              Responderemos às solicitações em até 15 (quinze) dias, podendo ser prorrogado por mais 15 (quinze) dias 
              quando necessário, mediante justificativa.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Segurança dos Dados
            </h2>
            <p className="mb-2">Implementamos medidas técnicas e organizacionais apropriadas, incluindo:</p>
            <ul className="ml-6 list-disc space-y-1">
              <li>Criptografia de dados sensíveis</li>
              <li>Controles de acesso restrito</li>
              <li>Monitoramento de segurança contínuo</li>
              <li>Backups regulares</li>
              <li>Treinamento de equipe em proteção de dados</li>
              <li>Avaliações periódicas de risco</li>
            </ul>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Transferência Internacional de Dados
            </h2>
            <p>
              Atualmente, não realizamos transferências internacionais de dados pessoais. Caso venha a ocorrer, 
              você será informado previamente e adotaremos as salvaguardas apropriadas exigidas pela LGPD.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Tratamento de Dados de Menores
            </h2>
            <p>
              Para usuários menores de 18 anos, coletamos apenas dados estritamente necessários, sempre com 
              o consentimento dos pais ou responsáveis legais quando aplicável. Para menores de 13 anos, 
              o consentimento dos pais é obrigatório.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Notificação de Incidentes de Segurança
            </h2>
            <p>
              Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, 
              comunicaremos o ocorrido de forma clara e imediata, conforme exigido pela LGPD, à Autoridade 
              Nacional de Proteção de Dados (ANPD) e aos titulares afetados.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Alterações nesta Página
            </h2>
            <p>
              Podemos atualizar esta página periodicamente para refletir mudanças em nossas práticas ou na legislação. 
              A data da última atualização será sempre indicada no topo desta página.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              Contato e Reclamações
            </h2>
            <p className="mb-3">
              Para questões relacionadas à LGPD ou para apresentar reclamações sobre o tratamento de seus dados pessoais:
            </p>
            <ul className="ml-6 space-y-2">
              <li>📧 Encarregado (DPO): <strong className="text-gold">dpo@ecl.gg</strong></li>
              <li>📧 Privacidade: <strong className="text-gold">privacidade@ecl.gg</strong></li>
              <li>📧 E-mail geral: contato@ecl.gg</li>
            </ul>
            <p className="mt-4 text-xs">
              Você também pode apresentar reclamações à Autoridade Nacional de Proteção de Dados (ANPD) através do site:{" "}
              <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light">
                www.gov.br/anpd
              </a>
            </p>
          </section>

          <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-xs">
            <p className="mb-2 font-semibold text-blue-400">📘 Saiba Mais sobre a LGPD</p>
            <p>
              Para mais informações sobre a Lei Geral de Proteção de Dados Pessoais, visite o site oficial da ANPD:{" "}
              <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light">
                www.gov.br/anpd
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
