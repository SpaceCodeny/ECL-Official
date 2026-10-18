# Elite Champions League — Plataforma Oficial de Torneios de Standoff 2

> **The Road to Glory.** Plataforma completa de esports para campeonatos competitivos de Standoff 2.

A Elite Champions League (ECL) é uma plataforma web profissional que funciona como um ecossistema competitivo: campeonatos, equipes, jogadores, partidas, classificações, chaveamentos, rankings e área administrativa — com frontend e backend independentes e dados persistidos em PostgreSQL.

---

## Sumário

- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Estrutura de diretórios](#estrutura-de-diretórios)
- [Configuração de ambiente](#configuração-de-ambiente)
- [Instalação e execução local](#instalação-e-execução-local)
- [Endereços locais](#endereços-locais)
- [Testes](#testes)
- [Documentação](#documentação)
- [Solução de problemas](#solução-de-problemas)

---

## Tecnologias

| Camada | Stack |
| --- | --- |
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 3 · TanStack Query · React Hook Form · Zod · Lucide React |
| **Backend** | NestJS 11 · TypeScript (strict) · Prisma 6 ORM · JWT · Socket.IO · Swagger/OpenAPI |
| **Banco de dados** | PostgreSQL 16 |
| **Infraestrutura** | Docker Compose · npm workspaces (monorepo) |

---

## Arquitetura

O projeto é um **monorepo** com separação rigorosa entre `Frontend/` e `Backend/`.

- O **frontend** é uma aplicação Next.js (App Router) que consome a API REST do backend por uma camada de serviços centralizada. Nenhum segredo, regra de negócio ou operação administrativa vive no frontend.
- O **backend** é uma API NestJS modular, versionada em `/api/v1`, com documentação Swagger em `/docs`. Funciona de forma independente do Next.js.
- A comunicação usa variáveis de ambiente (`NEXT_PUBLIC_API_URL`), sem hardcode de endereços. CORS é restritivo (origens explícitas).

Veja detalhes em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Requisitos

- **Node.js** ≥ 20 (recomendado 20 LTS ou superior)
- **npm** ≥ 10
- **Docker** + Docker Compose (para o PostgreSQL local) — *ou* uma instância PostgreSQL acessível

> Se o Docker não estiver disponível, é possível usar um PostgreSQL instalado localmente; basta ajustar a `DATABASE_URL` no `.env` do backend.

---

## Estrutura de diretórios

```text
elite-champions-league/
├── Frontend/            # Next.js (App Router) — interface pública, dashboard e admin
├── Backend/            # NestJS — API REST, Prisma, autenticação, lógica competitiva
│   ├── prisma/         # schema.prisma, migrations e seed
│   └── src/            # módulos da aplicação
├── docs/               # documentação técnica
├── docker-compose.yml  # PostgreSQL para desenvolvimento
└── package.json        # workspaces e scripts de conveniência
```

---

## Configuração de ambiente

Cada aplicação possui um `.env.example`. Copie e ajuste:

```bash
# Backend
cp Backend/.env.example Backend/.env

# Frontend
cp Frontend/.env.example Frontend/.env
```

Variáveis-chave do backend (`Backend/.env`):

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | String de conexão PostgreSQL (igual ao docker-compose) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Segredos JWT (gere com `openssl rand -base64 64`) |
| `CORS_ORIGINS` | Origens autorizadas, separadas por vírgula |
| `ADMIN_BOOTSTRAP_*` | Credenciais do primeiro admin no seed (apenas desenvolvimento) |
| `MAIL_PROVIDER` | `none` desativa envio; `smtp` exige SMTP_* |

Veja `Backend/.env.example` para a lista completa.

---

## Instalação e execução local

```bash
# 1. Instalar dependências do monorepo (frontend + backend)
npm install

# 2. Subir o PostgreSQL via Docker
docker compose up -d

# 3. Gerar o Prisma Client e aplicar migrações (requer banco no ar)
cd Backend
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed        # cria o admin de desenvolvimento
cd ..

# 4. Iniciar os servidores (em terminais separados)
npm run dev:backend        # http://localhost:3001
npm run dev:frontend       # http://localhost:3000
```

> Sem Docker: inicie um PostgreSQL local e ajuste `DATABASE_URL` antes do passo 3.

---

## Endereços locais

| Serviço | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| API REST | http://localhost:3001/api/v1 |
| Swagger / OpenAPI | http://localhost:3001/docs |
| Health check | http://localhost:3001/health |

---

## Testes

```bash
# Backend — Jest (testes unitários dos serviços)
cd Backend && npx jest

# Backend — com cobertura
cd Backend && npm run test:cov

# Frontend — typecheck
cd Frontend && npm run typecheck
```

Testes implementados (backend):
- `auth.service.spec.ts` — registro com hash, rejeição de duplicidade, login inválido.
- `matches.service.spec.ts` — validação de placar por formato (BO1/BO3), série não finalizada.

Cobertura de testes cobre os fluxos críticos de segurança (hash de senha, duplicidade) e integridade competitiva (validação de placares).

---

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura e decisões de design
- [`docs/API.md`](docs/API.md) — referência completa da API REST e WebSocket
- [`docs/DATABASE.md`](docs/DATABASE.md) — modelo de dados, relacionamentos e índices
- [`docs/SECURITY.md`](docs/SECURITY.md) — checklist de segurança e LGPD
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — guia de deploy, migração e backup

---

## Solução de problemas

**`prisma migrate` falha com "Can't reach database server"**
O PostgreSQL não está rodando. Execute `docker compose up -d` ou verifique a `DATABASE_URL`.

**Scripts de instalação nativa bloqueados (npm 11)**
O npm 11 bloqueia scripts de instalação por padrão. O `argon2` e o Prisma funcionam mesmo assim; se houver problema, gere o client manualmente com `npx prisma generate`.

**argon2 não carra em Node muito novo**
Este projeto foi validado em Node 20+ (incluindo 24). Se ocorrer falha de binário nativo, é possível trocar por `bcryptjs` (bcrypt em JS puro) ajustando o módulo de auth.

**Porta já em uso**
Ajuste `PORT` no `.env` do backend ou use outra porta no `next dev`.

---

## Licença

Este projeto é de uso interno da Elite Champions League. Todos os direitos reservados.
