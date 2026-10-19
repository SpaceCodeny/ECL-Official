export default function LGPDPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">LGPD - Lei Geral de Proteção de Dados</h1>
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: 19 de outubro de 2026
        </p>

        <p className="text-lg mb-6">
          A ECL está em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).
        </p>

        <h2 className="text-2xl font-semibold mb-4">Seus Direitos sob a LGPD</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Confirmação e acesso:</strong> Você pode confirmar se tratamos seus dados e solicitar acesso a eles</li>
          <li><strong>Correção:</strong> Solicitar correção de dados incompletos, inexatos ou desatualizados</li>
          <li><strong>Anonimização, bloqueio ou eliminação:</strong> Solicitar que seus dados sejam anonimizados, bloqueados ou eliminados</li>
          <li><strong>Portabilidade:</strong> Solicitar a transferência de seus dados a outro fornecedor</li>
          <li><strong>Revogação de consentimento:</strong> Revogar seu consentimento a qualquer momento</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Base Legal</h2>
        <p>
          O tratamento de dados pessoais na ECL é realizado com base no consentimento do usuário
          e na execução de contrato (participação em torneios).
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Encarregado de Dados (DPO)</h2>
        <p>
          Para exercer seus direitos ou tirar dúvidas sobre tratamento de dados, entre em contato:
        </p>
        <ul className="list-none space-y-1 mt-2">
          <li>Email: dpo@ecl.com</li>
          <li>Atendimento: Discord oficial ECL</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Segurança</h2>
        <p>
          Implementamos medidas técnicas e organizacionais para proteger seus dados contra
          acesso não autorizado, alteração, divulgação ou destruição.
        </p>
      </div>
    </div>
  );
}
