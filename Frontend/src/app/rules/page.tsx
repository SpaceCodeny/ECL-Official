export default function RulesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Regras da ECL</h1>
      <div className="prose dark:prose-invert max-w-none">
        <h2 className="text-2xl font-semibold mb-4">Regras Gerais</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Respeito entre todos os participantes é obrigatório</li>
          <li>Proibido uso de cheats, hacks ou modificações no jogo</li>
          <li>Times devem comparecer no horário agendado</li>
          <li>Decisões da arbitragem são finais</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Formatos de Partida</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>BO1 (Best of 1):</strong> Melhor de 1 mapa</li>
          <li><strong>BO3 (Best of 3):</strong> Melhor de 3 mapas</li>
          <li><strong>BO5 (Best of 5):</strong> Melhor de 5 mapas (finais)</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Disputas</h2>
        <p>
          Em caso de divergências, entre em contato com a administração através do Discord oficial.
        </p>
      </div>
    </div>
  );
}
