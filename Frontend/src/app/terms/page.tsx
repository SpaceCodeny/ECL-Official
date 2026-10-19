export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Termos de Uso</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 19 de outubro de 2026
        </p>

        <h2 className="text-2xl font-semibold mb-4">1. Aceitação dos Termos</h2>
        <p>
          Ao acessar e usar a plataforma ECL, você concorda com estes termos de uso.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Uso da Plataforma</h2>
        <p>
          A plataforma é destinada exclusivamente para organização e participação em torneios
          competitivos de Standoff 2.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Contas de Usuário</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Você é responsável pela segurança da sua conta</li>
          <li>Não compartilhe suas credenciais</li>
          <li>Notifique-nos imediatamente em caso de acesso não autorizado</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Conduta</h2>
        <p>
          Comportamento abusivo, ofensivo ou que viole as regras resultará em suspensão ou banimento.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Modificações</h2>
        <p>
          Reservamos o direito de modificar estes termos a qualquer momento.
        </p>
      </div>
    </div>
  );
}
