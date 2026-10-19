export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Política de Privacidade</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 19 de outubro de 2026
        </p>

        <h2 className="text-2xl font-semibold mb-4">1. Informações Coletadas</h2>
        <p>Coletamos as seguintes informações:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Nome de usuário e email</li>
          <li>Informações de perfil de jogador</li>
          <li>Histórico de partidas e estatísticas</li>
          <li>Dados de navegação e uso da plataforma</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">2. Uso das Informações</h2>
        <p>Seus dados são usados para:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Gerenciar sua conta e participação em torneios</li>
          <li>Melhorar a experiência na plataforma</li>
          <li>Comunicar atualizações e novidades</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">3. Compartilhamento</h2>
        <p>
          Não compartilhamos seus dados pessoais com terceiros, exceto quando necessário
          para operação da plataforma (hospedagem, banco de dados).
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">4. Seus Direitos</h2>
        <p>Você tem direito a:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Acessar seus dados</li>
          <li>Corrigir informações incorretas</li>
          <li>Solicitar exclusão da conta</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">5. Contato</h2>
        <p>
          Para questões sobre privacidade, entre em contato através do email: privacy@ecl.com
        </p>
      </div>
    </div>
  );
}
