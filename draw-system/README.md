# ECL Draw System

Sistema de sorteios competitivos para campeonatos de esports com experiência visual cinematográfica inspirada no Counter-Strike 2.

## 🎯 Visão Geral

Microserviço independente que permite:
- Gerenciar campeonatos e times
- Executar sorteios auditáveis com algoritmos criptograficamente seguros
- Revelar resultados com animações tipo "abertura de caixa" do CS2
- Gerar grupos e chaveamentos
- Expor API REST versionada para integração futura com a ECL

## 🏗️ Arquitetura

```
draw-system/
├── backend/          # API Node.js + Prisma + PostgreSQL
│   ├── prisma/       # Schema e migrações
│   ├── src/
│   │   ├── modules/  # Módulos de negócio
│   │   ├── api/      # Rotas REST versionadas
│   │   └── lib/      # Utilitários e serviços
│   └── tests/        # Testes unitários e integração
└── frontend/         # Next.js 14 App Router + TypeScript
    ├── src/
    │   ├── app/      # Rotas e páginas
    │   ├── components/ # Componentes React
    │   ├── modules/  # Lógica de negócio
    │   └── lib/      # Utilitários
    └── public/       # Assets estáticos
```

## 🚀 Stack Tecnológica

### Backend
- Node.js 20+
- TypeScript (strict mode)
- PostgreSQL 15+
- Prisma ORM
- Zod para validação
- API REST versionada (`/api/v1`)

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui
- Framer Motion para animações

### DevOps
- Docker & Docker Compose
- Vitest (testes unitários)
- Playwright (testes E2E)
- ESLint + Prettier

## 📋 Funcionalidades

### ✅ Core
- [x] Gestão de campeonatos
- [x] Cadastro de times com logos
- [x] Importação CSV/JSON
- [x] Algoritmos de sorteio seguros
- [x] Distribuição por grupos
- [x] Sorteio por potes
- [x] Auditoria completa

### 🎨 Experiência Visual
- [x] Roleta horizontal tipo CS2
- [x] Revelação cinematográfica
- [x] Efeitos sonoros
- [x] Tela pública para transmissão
- [x] Painel administrativo

### 🔐 Segurança
- [x] Autenticação administrativa
- [x] Autorização por função
- [x] Commit-reveal criptográfico
- [x] Fonte de aleatoriedade segura
- [x] Auditoria append-only

### 📡 API e Integração
- [x] API REST versionada
- [x] OpenAPI/Swagger docs
- [x] Exportação JSON/CSV
- [x] Webhooks (opcional)
- [x] Preparado para integração ECL

## 🏃 Quick Start

### Pré-requisitos
- Node.js 20+
- PostgreSQL 15+
- Docker (opcional)

### Instalação

```bash
# Clone o repositório (já está em ECL-Official)
cd draw-system

# Backend
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL no .env
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend (em outro terminal)
cd ../frontend
npm install
cp .env.example .env.local
# Configure NEXT_PUBLIC_API_URL no .env.local
npm run dev
```

### Docker (Recomendado)

```bash
cd draw-system
docker-compose up -d
```

Acesse:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Docs: http://localhost:3001/api/v1/docs

## 📖 Documentação

- [Arquitetura](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Algoritmos de Sorteio](./docs/DRAW_ALGORITHMS.md)
- [Auditoria e Segurança](./docs/SECURITY.md)
- [Integração com ECL](./docs/ECL_INTEGRATION.md)
- [Deploy](./docs/DEPLOYMENT.md)

## 🧪 Testes

```bash
# Backend
cd backend
npm test              # Todos os testes
npm run test:unit     # Unitários
npm run test:e2e      # Integração

# Frontend
cd frontend
npm test
npm run test:e2e      # Playwright
```

## 🎮 Como Usar

### 1. Criar Campeonato
```bash
curl -X POST http://localhost:3001/api/v1/tournaments \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "ECL Season 1",
    "game": "Standoff 2",
    "edition": "2024"
  }'
```

### 2. Cadastrar Times
- Via painel administrativo
- Importação CSV
- API REST

### 3. Configurar Sorteio
- Selecionar times elegíveis
- Definir quantidade de grupos
- Escolher método de distribuição
- Configurar restrições (potes)

### 4. Executar e Revelar
- Sistema gera resultado no servidor
- Animação revela cada time individualmente
- Efeitos sonoros e visuais
- Resultado persistido e auditável

### 5. Publicar e Exportar
- Publicar grupos oficiais
- Gerar chaveamento
- Exportar JSON/CSV
- Compartilhar link público

## 🔒 Segurança e Auditoria

- **Aleatoriedade Criptográfica**: `crypto.randomInt()` em vez de `Math.random()`
- **Fisher-Yates sem viés**: Implementação correta do embaralhamento
- **Commit-Reveal**: Hash publicado antes do sorteio
- **Trilha de Auditoria**: Logs append-only com timestamp e responsável
- **Idempotência**: Proteção contra execuções duplicadas
- **Transações**: Operações atômicas no banco

## 🌐 Integração com ECL

O Draw System é independente mas preparado para integração:

```typescript
// Portal ECL consome via API
const result = await fetch('https://draw.ecl.com/api/v1/tournaments/123/results', {
  headers: { 'X-API-Key': process.env.DRAW_API_KEY }
});

const { groups, bracket } = await result.json();
```

Campos de integração:
- `externalId`: ID do campeonato na ECL
- `team.externalId`: ID do time na ECL
- Webhooks para notificação de publicação

## 📝 Variáveis de Ambiente

### Backend (.env)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ecl_draw
DIRECT_URL=postgresql://user:pass@localhost:5432/ecl_draw
JWT_SECRET=seu_secret_aqui
NODE_ENV=development
PORT=3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## 🤝 Contribuindo

1. Siga os padrões de código (ESLint + Prettier)
2. Escreva testes para novas funcionalidades
3. Documente mudanças na API
4. Atualize este README se necessário

## 📄 Licença

Proprietário © Elite Champions League

---

**Status do Projeto**: 🚧 Em Desenvolvimento

**Versão Atual**: 0.1.0 (Alpha)

**Última Atualização**: 28 de Outubro de 2026
