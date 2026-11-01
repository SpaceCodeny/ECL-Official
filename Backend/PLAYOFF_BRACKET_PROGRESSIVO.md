# Sistema de Bracket Progressivo — ECL MASTER EDITION

## Visão Geral

O bracket dos playoffs no ECL MASTER EDITION está **sempre disponível desde a criação do torneio**, sendo preenchido progressivamente conforme equipes se classificam na fase Swiss.

## Comportamento Esperado

### 1. Disponibilidade Imediata

- ✅ Bracket visível assim que o campeonato é criado
- ✅ Não requer finalização do Swiss
- ✅ Não requer ação manual do administrador
- ✅ Funciona em qualquer estado do torneio

### 2. Estrutura Inicial

O bracket de 16 posições é composto por:

#### 4 Convidados (Posições Fixas)

- Inseridos manualmente pelo admin via `InvitedTeam`
- Ocupam seeds específicos: 1, 8, 4, 5 (correspondentes a bracketSlot 1-4)
- **Nunca mudam de posição**
- Identificados visualmente com estrela dourada

#### 12 Classificados Swiss (Posições Dinâmicas)

- Preenchidos automaticamente conforme times atingem 3 vitórias
- Exibem placeholders enquanto vazios: "1º Classificado", "2º Classificado", etc.
- Ordenados por critérios oficiais de desempate
- Atualizam em tempo real a cada resultado

## Atualização Automática

### Gatilho

A atualização ocorre **automaticamente** após cada resultado de partida Swiss ser registrado.

### Localização do Código

```
Backend/src/routes/matches.routes.ts
```

Dentro da transação que atualiza `SwissCampaign`, após registrar wins/losses.

### Algoritmo

```typescript
// 1. Buscar todos os classificados (wins >= 3)
const allClassified = await tx.swissCampaign.findMany({
  where: { tournamentId, wins: { gte: 3 } }
});

// 2. Ordenar por critérios oficiais
const sorted = allClassified.sort((a, b) => {
  if (b.wins !== a.wins) return b.wins - a.wins;           // 1º: mais vitórias
  if (b.roundDiff !== a.roundDiff) return b.roundDiff - a.roundDiff;  // 2º: melhor saldo
  if (a.losses !== b.losses) return a.losses - b.losses;   // 3º: menos derrotas
  return a.teamId.localeCompare(b.teamId);                 // 4º: desempate alfabético
});

// 3. Atualizar finalPosition
for (let i = 0; i < sorted.length; i++) {
  await tx.swissCampaign.update({
    where: { id: sorted[i].id },
    data: { finalPosition: i + 1, isEliminated: false }
  });
}
```

### Critérios de Desempate (em ordem)

1. **Vitórias** (maior vence)
2. **Saldo de rounds** (`roundDiff`, maior vence)
3. **Derrotas** (menor vence)
4. **ID do time** (alfabético, tiebreaker final)

## Construção do Bracket

### Endpoint

```
GET /tournaments/:tournamentId/bracket
```

### Função Principal

```typescript
async function buildPlayoffBracket(tournamentId: string): Promise<PlayoffBracket>
```

Localização: `Backend/src/routes/bracket.routes.ts`

### Lógica

1. **Buscar convidados**: 4 times em `InvitedTeam`
2. **Buscar classificados**: campanhas com `finalPosition !== null`
3. **Montar mapa seed → time**:
   - Convidados: seeds 1, 8, 4, 5 (fixos)
   - Classificados: seeds restantes [2,3,6,7,9,10,11,12,13,14,15,16]
4. **Gerar matches virtuais** para cada fase:
   - RO16: 8 matches (posições 1-16)
   - QF: 4 matches (vencedores RO16)
   - SF: 2 matches (vencedores QF)
   - FINAL: 1 match (vencedores SF)
5. **Para cada slot**:
   - Se time disponível → dados reais
   - Se vazio → placeholder com label

### Retorno

```typescript
interface PlayoffBracket {
  isGenerated: boolean;        // true se partidas criadas no banco
  swissFinalized: boolean;     // true se todos os 12 classificados definidos
  invitedTeams: InvitedTeam[];
  ro16: VirtualMatch[];        // 8 matches
  qf: VirtualMatch[];          // 4 matches
  sf: VirtualMatch[];          // 2 matches
  final: VirtualMatch[];       // 1 match
}
```

## Distribuição de Seeds

### Mapeamento Seed → Posição RO16

```
Seed 1  (convidado 1) → RO16-1 posição A
Seed 16 (12º classif)  → RO16-1 posição B
Seed 8  (convidado 2) → RO16-2 posição A
Seed 9  (4º classif)   → RO16-2 posição B
Seed 4  (convidado 3) → RO16-3 posição A
Seed 13 (8º classif)   → RO16-3 posição B
Seed 5  (convidado 4) → RO16-4 posição A
Seed 12 (9º classif)   → RO16-4 posição B
Seed 2  (2º classif)   → RO16-5 posição A
Seed 15 (11º classif)  → RO16-5 posição B
Seed 7  (6º classif)   → RO16-6 posição A
Seed 10 (5º classif)   → RO16-6 posição B
Seed 3  (3º classif)   → RO16-7 posição A
Seed 14 (10º classif)  → RO16-7 posição B
Seed 6  (7º classif)   → RO16-8 posição A
Seed 11 (1º classif)   → RO16-8 posição B
```

## Frontend

### Componente

```
Frontend/src/components/tournaments/playoff-bracket-view.tsx
```

### Comportamento

- **Sempre renderiza** o bracket completo
- Não valida existência de partidas
- Usa `teamALabel` / `teamBLabel` para placeholders
- Badge de estrela para convidados (`isInvitedA` / `isInvitedB`)

### Status Visual

```typescript
{data.swissFinalized ? (
  "Swiss finalizado — 12 classificados definidos"
) : (
  "Classificação em andamento"
)}
```

## Persistência

- `finalPosition` é armazenado em `SwissCampaign` no PostgreSQL
- Sobrevive a:
  - Recargas de página
  - Reinicializações do servidor
  - Consultas de diferentes dispositivos
- Não é recalculado em cada requisição

## Diferença: isGenerated vs Disponibilidade

### `isGenerated: false`
- Partidas ainda não criadas no banco de dados
- Bracket usa IDs virtuais (`virtual-RO16-1`, etc.)
- **Bracket continua visível e funcional**

### `isGenerated: true`
- Admin chamou `POST /bracket/generate`
- Partidas reais criadas com IDs do banco
- Permite registro de resultados

**Importante**: Em ambos os casos o bracket é **completamente visível**.

## Comando /swiss/finalize

### Propósito

- Definir `finalPosition` para **todos** os 20 times (não só classificados)
- Marcar os 8 eliminados como `isEliminated: true`
- Fechar oficialmente a fase Swiss

### O que NÃO faz

- ❌ Não é pré-requisito para visualizar o bracket
- ❌ Não cria as posições dos classificados (já criadas automaticamente)
- ❌ Não afeta a disponibilidade do bracket

## Fluxo Completo

### 1. Criação do Torneio

```
✅ Torneio criado com preset ECL MASTER
✅ 4 convidados inseridos
✅ Bracket imediatamente visível com:
   - 4 times convidados nas posições fixas
   - 12 placeholders: "1º Classificado" até "12º Classificado"
```

### 2. Durante o Swiss

```
📍 Time A conquista 3ª vitória (campanha 3-0)
   ↓
🔄 Sistema recalcula posições de TODOS os classificados
   ↓
✅ Time A aparece no bracket na posição correta (ex: "1º Classificado")
   ↓
📍 Time B conquista 3ª vitória (campanha 3-1, saldo menor)
   ↓
🔄 Sistema recalcula: Time A continua 1º, Time B assume 2º
   ↓
✅ Bracket atualizado automaticamente
```

### 3. Após Swiss Completo

```
✅ 12 times classificados, todos com finalPosition definida
✅ Bracket mostra os 12 + 4 convidados = 16 posições preenchidas
✅ Admin pode chamar /bracket/generate para criar partidas reais
```

## Arquivos Importantes

### Backend

- `src/routes/matches.routes.ts` — Atualização automática pós-resultado
- `src/routes/bracket.routes.ts` — Construção do bracket
- `src/services/swiss-classification.service.ts` — Lógica de classificação
- `prisma/schema.prisma` — Modelo `SwissCampaign` com `finalPosition`

### Frontend

- `src/components/tournaments/playoff-bracket-view.tsx` — Visualização
- `src/types/preset.ts` — Tipos do bracket

## Testes Recomendados

### 1. Verificar Disponibilidade Imediata

```
1. Criar torneio ECL MASTER
2. Adicionar 4 convidados
3. Acessar aba Playoffs
4. ✅ Confirmar bracket visível com convidados e placeholders
```

### 2. Testar Classificação Progressiva

```
1. Registrar resultado: Time A vence, atinge 3-0
2. Atualizar página
3. ✅ Confirmar Time A aparece como "1º Classificado"
4. Registrar mais vitórias para outros times
5. ✅ Confirmar reordenação por saldo de rounds
```

### 3. Verificar Persistência

```
1. Classificar alguns times
2. Recarregar página
3. ✅ Confirmar posições mantidas
4. Acessar de outro dispositivo
5. ✅ Confirmar mesmo estado
```

### 4. Validar Posições Fixas dos Convidados

```
1. Convidado 1 deve estar em seed 1 (RO16-1 posição A)
2. Convidado 2 deve estar em seed 8 (RO16-2 posição A)
3. Convidado 3 deve estar em seed 4 (RO16-3 posição A)
4. Convidado 4 deve estar em seed 5 (RO16-4 posição A)
5. ✅ Confirmar que nunca mudam independente dos classificados
```

## Troubleshooting

### Bracket não aparece

- ✅ Verificar se preset é ECL MASTER ou similar
- ✅ Conferir endpoint `/bracket` retorna dados
- ✅ Validar arrays `ro16`, `qf`, `sf`, `final` não são null

### Classificados não aparecem

- ✅ Verificar se `finalPosition` foi definido no banco
- ✅ Conferir se resultado da partida Swiss foi registrado
- ✅ Validar que atualização automática está funcionando (logs)

### Convidados na posição errada

- ✅ Verificar `bracketSlot` na tabela `InvitedTeam` (deve ser 1-4)
- ✅ Conferir mapeamento de seeds na função `buildPlayoffBracket`

### Ordem dos classificados incorreta

- ✅ Validar critérios de ordenação (wins → roundDiff → losses)
- ✅ Conferir cálculo de `roundDiff` nas partidas
- ✅ Verificar logs após registro de resultado

---

**Regra de Ouro**: O bracket existe desde sempre. Os times aparecem conforme se classificam. Simples assim.
