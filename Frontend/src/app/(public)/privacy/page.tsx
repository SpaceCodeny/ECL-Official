import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de privacidade da Elite Champions League",
};

export default function PrivacyPage() {
  return (
    <div className="container-ecl py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-display text-4xl font-bold uppercase tracking-tight text-paper">
          Política de Privacidade
        </h1>
        <p className="mb-8 text-sm text-muted">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="space-y-6 text-sm text-muted">
          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              1. Introdução
            </h2>
            <p>
              A Elite Champions League ("ECL", "nós" ou "nosso") respeita a privacidade dos usuários 
              ("você" ou "seu") de nossa plataforma. Esta Política de Privacidade explica como coletamos, 
              usamos, divulgamos e protegemos suas informações quando você utiliza nosso site e serviços.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              2. Informações que Coletamos
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="mb-2 font-semibold text-paper">2.1 Informações Fornecidas por Você</h3>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Nome completo e nome de usuário</li>
                  <li>Endereço de e-mail</li>
                  <li>Informações da equipe (nome, tag, logo)</li>
                  <li>Dados de jogadores (IGN, estatísticas)</li>
                  <li>Comunicações que você envia para nós</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-paper">2.2 Informações Coletadas Automaticamente</h3>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Endereço IP e localização geográfica</li>
                  <li>Tipo de navegador e dispositivo</li>
                  <li>Páginas visitadas e tempo de acesso</li>
                  <li>Cookies e tecnologias similares</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              3. Como Usamos Suas Informações
            </h2>
            <ul className="ml-6 list-disc space-y-2">
              <li>Fornecer, manter e melhorar nossos serviços</li>
              <li>Gerenciar inscrições e participação em torneios</li>
              <li>Processar transações e enviar confirmações</li>
              <li>Comunicar atualizações, comunicados e suporte</li>
              <li>Personalizar sua experiência na plataforma</li>
              <li>Detectar e prevenir fraudes e violações de regras</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              4. Compartilhamento de Informações
            </h2>
            <p className="mb-3">Não vendemos suas informações pessoais. Podemos compartilhar seus dados apenas nas seguintes situações:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong className="text-paper">Com seu consentimento:</strong> Quando você autoriza expressamente</li>
              <li><strong className="text-paper">Informações públicas:</strong> Estatísticas, rankings e perfis de equipes são visíveis publicamente</li>
              <li><strong className="text-paper">Provedores de serviço:</strong> Empresas que nos auxiliam (hospedagem, análise, suporte)</li>
              <li><strong className="text-paper">Obrigações legais:</strong> Quando exigido por lei ou ordem judicial</li>
            </ul>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              5. Cookies e Tecnologias Similares
            </h2>
            <p className="mb-2">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, incluindo:
            </p>
            <ul className="ml-6 list-disc space-y-2">
              <li><strong className="text-paper">Cookies essenciais:</strong> Necessários para o funcionamento do site</li>
              <li><strong className="text-paper">Cookies de desempenho:</strong> Para análise e melhoria do site</li>
              <li><strong className="text-paper">Cookies funcionais:</strong> Para lembrar suas preferências</li>
            </ul>
            <p className="mt-3">Você pode gerenciar cookies através das configurações do seu navegador.</p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              6. Segurança de Dados
            </h2>
            <p>
              Implementamos medidas técnicas e organizacionais apropriadas para proteger suas informações 
              contra acesso não autorizado, alteração, divulgação ou destruição. No entanto, nenhum método 
              de transmissão ou armazenamento eletrônico é 100% seguro.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              7. Seus Direitos
            </h2>
            <p className="mb-2">Você tem direito a:</p>
            <ul className="ml-6 list-disc space-y-2">
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir dados incorretos ou incompletos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar consentimentos</li>
              <li>Portar seus dados para outro serviço</li>
              <li>Opor-se ao processamento de seus dados</li>
            </ul>
            <p className="mt-3">
              Para exercer esses direitos, entre em contato através de: <strong className="text-gold">privacidade@ecl.gg</strong>
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              8. Retenção de Dados
            </h2>
            <p>
              Mantemos suas informações pessoais pelo tempo necessário para cumprir os propósitos descritos 
              nesta política, salvo se um período de retenção mais longo for exigido ou permitido por lei.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              9. Privacidade de Menores
            </h2>
            <p>
              Nossos serviços são destinados a usuários maiores de 13 anos. Não coletamos intencionalmente 
              informações de menores de 13 anos. Se tomarmos conhecimento de que coletamos dados de um menor, 
              tomaremos medidas para excluí-los.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              10. Alterações nesta Política
            </h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações 
              significativas através do site ou por e-mail. A data da última atualização será sempre indicada no topo.
            </p>
          </section>

          <section className="card-ecl p-6">
            <h2 className="mb-3 font-display text-xl font-bold uppercase text-gold">
              11. Contato
            </h2>
            <p className="mb-3">Para dúvidas sobre esta Política de Privacidade, entre em contato:</p>
            <ul className="ml-6 space-y-1">
              <li>📧 E-mail: <strong className="text-gold">privacidade@ecl.gg</strong></li>
              <li>📧 E-mail geral: contato@ecl.gg</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
