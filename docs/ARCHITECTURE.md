# Arquitetura — Elite Champions League

## Visão geral

A ECL é um monorepo com duas aplicações independentes que se comunicam exclusivamente via API REST (e WebSockets para casos em tempo real).

```text
┌───────────────┐        HTTP/REST (api/v1)        ┌───────────────┐
│   Frontend    │  ──────────────────────────────► │    Backend     │
│   Next.js 16  │  ◄────────── WebSocket ──────────│    NestJS 11   │
│   (SSR/CSR)   │                                  │   (REST + WS)  │
└───────────────┘                                  └───────┬────────┘
                                                           │
                                                   ┌───────▼────────┐
                                                   │  PostgreSQL 16 │
                                                   │   (Prisma ORM)  │
                                                   └────────────────┘
```

## Princípios

1. **Separação rigorosa** — regras de negócio, credenciais e operações administrativas vivem no backend. O frontend nunca toma decisões de segurança.
2. **API versionada** — todas as rotas públicas sob `/api/v1`. Health check fica na raiz.
3. **Modularidade** — o backend é dividido em módulos NestJS (`auth`, `users`, `teams`, `tournaments`, `matches`, etc.), cada um com controller, service, DTOs e regras próprias.
4. **Estado no servidor** — classificações, estatísticas e rankings são calculados no backend dentro de transações; o frontend apenas exibe.
5. **Validação consistente** — entradas validadas com Zod (pipe global opt-in por DTO) e guards de autorização por recurso.
6. **Server Components por padrão** — o frontend usa React Server Components; Client Components apenas onde há interatividade.

## Camadas do backend

```text
src/
├── main.ts                # bootstrap: CORS, Swagger, prefixo global
├── app.module.ts          # módulo raiz (pipes/filtros/interceptors globais)
├── config/                # validação tipada de variáveis de ambiente
├── common/                # decorators, filters, guards, interceptors, pipes
├── database/              # PrismaService (wrapper injetável)
├── modules/               # módulos de domínio (auth, teams, tournaments, ...)
└── health/                # health check
```

## Camadas do frontend

```text
src/
├── app/                   # rotas (App Router): (public), (auth), dashboard, admin, ...
├── components/            # ui, layout, navigation, tournaments, teams, matches, ...
├── lib/                   # utilitários (cn, formatação de datas/placares)
├── services/              # clientes HTTP centralizados por domínio
├── hooks/                 # hooks de TanStack Query
├── stores/                # Zustand somente quando há estado global real
├── types/                 # tipos compartilhados do frontend
└── validators/            # schemas Zod para formulários
```

## Fluxo de dados

- **Consultas:** Frontend → `services/*` → `GET /api/v1/...` → Service → Prisma → PostgreSQL.
- **Mutações:** Frontend → React Hook Form + Zod → `POST/PATCH` → validação backend → Service → transação Prisma.
- **Tempo real:** Backend publica eventos via Socket.IO em canais com permissão verificada no servidor; frontend assina canais autorizados.

## Decisões importantes

- **Argon2id** para hash de senhas (fallback documentado para bcryptjs em ambientes sem binário nativo).
- **JWT** com access token curto + refresh token, em cookies HttpOnly/Secure em produção.
- **Transações Prisma** para operações competitivas (inscrições, resultados, avanço de chaveamento) para tratar concorrência de vagas.
- **Exclusão lógica** (`deletedAt`) para entidades importantes; retenção conforme LGPD.
- **Auditoria** registrando ator, ação, entidade e diffs antes/depois — sem senhas ou tokens.
