# API REST — Elite Champions League

## Visão geral

- **Base URL:** `http://localhost:3001/api/v1`
- **Documentação interativa:** `http://localhost:3001/docs` (Swagger/OpenAPI)
- **WebSocket:** `http://localhost:3001/realtime` (Socket.IO, namespace `/realtime`)
- **Autenticação:** Bearer JWT (access token) em cabeçalho `Authorization: Bearer <token>`
- **Formato:** JSON. Codificação UTF-8.
- **Paginação:** parâmetros `page` (1-indexed) e `pageSize` em endpoints de listagem.
- **Rate limiting:** `@nestjs/throttler` global (configurável via `THROTTLE_TTL`/`THROTTLE_LIMIT`).
- **Erros:** corpo padronizado:

```json
{
  "statusCode": 422,
  "message": "Falha de validação",
  "error": "Unprocessable Entity",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/tournaments",
  "details": { "name": "Nome é obrigatório" }
}
```

## Autenticação

| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| POST | `/auth/register` | Cadastro de usuário | Pública |
| POST | `/auth/login` | Login (emite access + refresh) | Pública |
| POST | `/auth/logout` | Encerra sessão (revoga refresh) | Pública |
| POST | `/auth/refresh` | Renova access token | Pública |
| POST | `/auth/forgot-password` | Solicita reset por e-mail | Pública |
| POST | `/auth/reset-password` | Redefine senha com token | Pública |
| GET | `/auth/me` | Perfil do usuário autenticado | Autenticada |

## Usuários

| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/users/me` | Perfil autenticado | Autenticada |
| PATCH | `/users/me` | Atualiza perfil | Autenticada |
| GET | `/users/:username` | Perfil público por username | Pública |

## Equipes

| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/teams` | Lista com busca/paginação | Pública |
| GET | `/teams/:slug` | Detalhes + elenco | Pública |
| POST | `/teams` | Cria equipe (requer PlayerProfile) | Autenticada |
| PATCH | `/teams/:id` | Atualiza dados (capitão/admin) | Autenticada |
| POST | `/teams/:id/invitations` | Convida jogador por e-mail | Capitão/Admin |
| DELETE | `/teams/:id/members/:playerId` | Remove jogador | Capitão/Admin |

## Campeonatos

| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/tournaments` | Lista com filtros (status, search) | Pública |
| GET | `/tournaments/featured` | Campeonato em destaque | Pública |
| GET | `/tournaments/:slug` | Detalhes completos | Pública |
| POST | `/tournaments` | Cria campeonato | Admin/Organizer |
| PATCH | `/tournaments/:id` | Atualiza dados | Admin/Organizer |
| POST | `/tournaments/:id/publish` | Transição → PUBLISHED | Admin/Organizer |
| POST | `/tournaments/:id/open-registrations` | → REGISTRATION_OPEN | Admin/Organizer |
| POST | `/tournaments/:id/close-registrations` | → REGISTRATION_CLOSED | Admin/Organizer |
| POST | `/tournaments/:id/start` | → IN_PROGRESS | Admin/Organizer |
| POST | `/tournaments/:id/complete` | → COMPLETED | Admin/Organizer |
| POST | `/tournaments/:id/cancel` | → CANCELLED | Admin/Organizer |
| GET | `/tournaments/:id/standings` | Classificação por grupos | Pública |
| GET | `/tournaments/:id/bracket` | Chaveamento | Pública |

## Inscrições

| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/tournaments/:tournamentId/registrations` | Lista inscrições | Pública |
| POST | `/tournaments/:tournamentId/registrations` | Inscreve equipe | Capitão/Admin |
| POST | `/tournaments/:tournamentId/registrations/:id/approve` | Aprova | Admin/Organizer |
| POST | `/tournaments/:tournamentId/registrations/:id/reject` | Rejeita | Admin/Organizer |
| POST | `/tournaments/:tournamentId/registrations/:id/withdraw` | Retira | Capitão/Admin |

## Partidas

| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/matches` | Lista com filtros (status, tournamentId, limit) | Pública |
| GET | `/matches/:id` | Detalhes + mapas + disputas | Pública |
| POST | `/matches/:id/results` | Registra resultado (valida BO) | Árbitro/Admin |
| POST | `/matches/:id/disputes` | Abre contestação | Autenticada |

## Ranking · Estatísticas · Comunicados · Notificações

| Método | Rota | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/rankings/teams` | Ranking de equipes (limit, season) | Pública |
| GET | `/stats` | Estatísticas da organização | Pública |
| GET | `/announcements` | Lista comunicados (limit, type) | Pública |
| POST | `/announcements` | Cria comunicado | Admin/Organizer |
| GET | `/notifications` | Notificações do usuário (unreadOnly) | Autenticada |
| POST | `/notifications/:id/read` | Marca como lida | Autenticada |
| POST | `/notifications/read-all` | Marca todas como lidas | Autenticada |

## Administração (requer ADMINISTRATOR ou SUPER_ADMIN)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/admin/dashboard` | Indicadores, gráficos e atividade recente |
| GET | `/admin/users` | Lista usuários (search, role, status) |
| PATCH | `/admin/users/:userId/role` | Altera papel de usuário |
| POST | `/admin/users/:userId/suspend` | Suspende (revoga sessões) |
| POST | `/admin/users/:userId/reactivate` | Reativa |
| GET | `/admin/audit-logs` | Logs de auditoria (entity, actorId) |

## WebSocket (Socket.IO — namespace `/realtime`)

| Evento (client → server) | Descrição |
| --- | --- |
| `subscribe:match` | Inscreve em `live:{matchId}` (placar ao vivo) |
| `subscribe:tournament` | Inscreve em `tournament:{tournamentId}` (status de partidas) |
| `unsubscribe` | Sai de um canal |

| Evento (server → client) | Descrição |
| --- | --- |
| `match:score` | Atualização de placar ao vivo |
| `match:status` | Mudança de status de partida |
| `notification` | Notificação pessoal do usuário |

> A permissão de acesso aos canais é verificada no servidor via JWT no `handleConnection`.

## Versionamento

A versão atual é `v1`. Quebras de compatibilidade introduzem `v2` mantendo `v1` durante transição.
