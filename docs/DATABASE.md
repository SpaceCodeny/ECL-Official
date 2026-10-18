# Banco de Dados — Elite Champions League

## Visão geral

- **SGBD:** PostgreSQL 16
- **ORM:** Prisma 6 (`prisma migrate dev` em desenvolvimento; `migrate deploy` em produção)
- **Convenções:** IDs UUID, `createdAt`/`updatedAt` automáticos, exclusão lógica via `deletedAt` quando aplicável.
- **Migração:** SOMENTE `prisma migrate dev/deploy`. `prisma db push` não é usado em produção.

## Entidades implementadas (schema completo)

### Usuários e sessões
- **User** — conta, papel (`UserRole`), situação (`UserStatus`), hash argon2id, verificação de e-mail.
- **UserSession** — refresh tokens hasheados (SHA-256), revogáveis individualmente.
- **PasswordResetToken** — tokens de reset de uso único com expiração.
- **EmailVerificationToken** — tokens de verificação de e-mail de uso único.

### Jogadores e equipes
- **PlayerProfile** — perfil competitivo vinculado ao usuário (nickname, ID Standoff 2, bio, país).
- **Team** — equipe (nome único, slug, tag, logo, capitão, isActive).
- **TeamMembership** — vínculo jogador↔equipe (CAPTAIN/PLAYER/SUBSTITUTE), com `leftAt`.
- **TeamInvitation** — convites por e-mail (PENDING/ACCEPTED/DECLINED/EXPIRED).

### Campeonatos
- **Tournament** — campeonato com `TournamentStatus` (7 estados) e `TournamentFormat` (4 formatos), `SeriesFormat` (BO1/BO3/BO5), `autoApprove`, `prizePool`, `rules`.
- **TournamentRegistration** — inscrição (PENDING/APPROVED/REJECTED/WITHDRAWN), única por `(tournamentId, teamId)`.
- **TournamentStage** — fase (GROUP/BRACKET/ROUND_ROBIN) com ordem e `SeriesFormat` próprio.
- **Group** — grupo de fase de grupos.

### Partidas
- **Match** — partida (7 status), placar agregado, vencedor, `groupId` opcional, `streamUrl`.
- **MatchMap** — placar por mapa individual, com `winnerId` e `played`.
- **MatchDispute** — contestação (OPEN/RESOLVED/REJECTED) com resolução.

### Classificação e ranking
- **Standing** — classificação por grupo (jogos, V/D, maps won/lost, pontos). Único por `(groupId, teamId)`.
- **RankingSnapshot** — histórico de posições por temporada (variação de posição ao longo do tempo).
- **TournamentRankingPoints** — pontuação configurável por colocação (campeão, vice, etc.).

### Conteúdo e comunicação
- **Announcement** — comunicados/notícias (5 tipos), com `tournamentId` opcional.
- **Notification** — notificações internas persistidas por usuário, com `read` e `entityId`.

### Auditoria
- **AuditLog** — registro de ações críticas (CREATE/UPDATE/DELETE/APPROVE/REJECT/CANCEL/PUBLISH/SUSPEND) com `before`/`after` (JSON), ator, IP, userAgent.

## Relacionamentos principais

```text
User 1—1 PlayerProfile
PlayerProfile 1—* TeamMembership *—1 Team
Team 1—* TournamentRegistration *—1 Tournament
Tournament 1—* TournamentStage 1—* (Group | Match)
Match 1—* MatchMap / MatchDispute
Group 1—* Standing
Team 1—* RankingSnapshot
Tournament 1—* TournamentRankingPoints
User 1—* Notification / AuditLog
```

## Resultados derivados

- **Classificação (Standing):** calculada incrementalmente ao registrar resultado de partida (dentro de transação). Cada vitória soma 3 pontos; empates não somam (configurável). Mapas vencidos/perdidos acumulados.
- **Ranking geral:** agregado a partir de partidas completadas (vitórias × 3) ou a partir de `RankingSnapshot` quando há temporada especificada.
- **Avanço de chaveamento:** o vencedor de cada partida é definido no `submitResult`; a geração de confrontos da próxima fase é responsabilidade do organizador/admin via criação de novas `Match`.

## Índices

Índices criados para consultas frequentes:
- `User`: status, role, deletedAt
- `Team`: slug (unique), isActive, deletedAt
- `Tournament`: status, slug (unique), startDate, deletedAt
- `TournamentRegistration`: tournamentId, teamId, status + unique (tournamentId, teamId)
- `Match`: tournamentId, stageId, status, scheduledAt, teamAId, teamBId
- `Standing`: groupId, teamId + unique (groupId, teamId)
- `RankingSnapshot`: teamId, season, snapshotAt
- `Notification`: userId, read, createdAt
- `AuditLog`: actorId, (entity, entityId), createdAt

## Seed de desenvolvimento

Script idempotente (`prisma/seed.ts`) que cria:
- 1 admin (via `ADMIN_BOOTSTRAP_*` env)
- 6 jogadores demo + 6 equipes demo
- 1 campeonato IN_PROGRESS com grupos A/B, partidas com resultado e standings
- 3 anúncios

> Todos os dados de demo são fictícios e claramente identificados.
