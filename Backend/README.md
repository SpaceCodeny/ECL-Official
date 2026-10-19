# ECL Backend - Express API

Backend da Elite Champions League, migrado de NestJS para Express.js.

## 🚀 Stack Tecnológica

- **Framework**: Express.js
- **Runtime**: Node.js + TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Auth**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI
- **Deploy**: Vercel Serverless Functions

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npm run prisma:generate

# Rodar migrations
npm run prisma:migrate
```

## 🛠️ Desenvolvimento

```bash
# Modo desenvolvimento (watch mode)
npm run dev

# Build para produção
npm run build

# Iniciar produção local
npm start
```

## 🗄️ Banco de Dados

```bash
# Criar uma nova migration
npm run prisma:migrate

# Abrir Prisma Studio (GUI)
npm run prisma:studio

# Seed do banco
npm run prisma:seed
```

## 📚 Documentação

Acesse a documentação Swagger em desenvolvimento:
```
http://localhost:3001/docs
```

## 🌐 Endpoints Principais

### Health Check
- `GET /health` - Health check completo
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Autenticação
- `POST /api/v1/auth/register` - Registro de usuário
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/forgot-password` - Recuperar senha
- `POST /api/v1/auth/reset-password` - Redefinir senha
- `GET /api/v1/auth/me` - Perfil do usuário autenticado

### Outras Rotas
- `/api/v1/users` - Usuários
- `/api/v1/teams` - Times
- `/api/v1/tournaments` - Torneios
- `/api/v1/matches` - Partidas
- `/api/v1/rankings` - Rankings
- `/api/v1/announcements` - Anúncios
- `/api/v1/stats` - Estatísticas
- `/api/v1/admin` - Administração
- `/api/v1/notifications` - Notificações
- `/api/v1/players` - Jogadores
- `/api/v1/uploads` - Uploads

## 🔐 Autenticação

A API usa JWT Bearer tokens. Para endpoints protegidos, envie o token no header:

```
Authorization: Bearer <seu_access_token>
```

## 🚀 Deploy na Vercel

```bash
# Deploy automático via Git push
git push origin main

# Ou via CLI da Vercel
npx vercel --prod
```

### Variáveis de Ambiente na Vercel

Configure estas variáveis no dashboard da Vercel:

```env
DATABASE_URL=
DIRECT_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CORS_ORIGINS=
SERVERLESS=true
```

## 📝 Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```env
# App
NODE_ENV=development
PORT=3001
APP_NAME=Elite Champions League
APP_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# JWT
JWT_ACCESS_SECRET=your-secret-key-min-16-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-16-chars
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=60

# Uploads
UPLOAD_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=ecl-assets

# Email (opcional)
MAIL_PROVIDER=none
MAIL_FROM=noreply@ecl.local
```

## 🔧 Estrutura do Projeto

```
Backend/
├── api/                    # Vercel serverless handlers
│   ├── index.js           # Main API handler
│   └── ping.js            # Ping endpoint
├── prisma/                # Database schema e migrations
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app.ts             # Express app configuration
│   ├── server.ts          # Development server
│   ├── config/            # Configuration
│   │   └── environment.ts
│   ├── database/          # Prisma client
│   │   └── prisma.ts
│   ├── dtos/              # Data Transfer Objects (Zod schemas)
│   │   └── auth.dto.ts
│   ├── middlewares/       # Express middlewares
│   │   ├── auth.ts
│   │   ├── authorize.ts
│   │   ├── error-handler.ts
│   │   ├── not-found-handler.ts
│   │   ├── request-logger.ts
│   │   └── validate.ts
│   ├── routes/            # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   └── ...
│   ├── services/          # Business logic
│   │   └── auth.service.ts
│   ├── types/             # TypeScript types
│   │   └── jwt.ts
│   └── utils/             # Utility functions
│       └── app-error.ts
├── package.json
├── tsconfig.json
└── vercel.json            # Vercel configuration
```

## 🧪 Testes

```bash
# Rodar testes
npm test

# Testes com coverage
npm run test:cov

# Testes em watch mode
npm run test:watch
```

## 📄 Licença

Privado - Elite Champions League © 2024
