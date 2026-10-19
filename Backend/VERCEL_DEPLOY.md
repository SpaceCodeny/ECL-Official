# 🚀 Guia Completo de Deploy na Vercel

## ✅ Pré-requisitos

- [x] Conta na Vercel (https://vercel.com)
- [x] Repositório Git (GitHub, GitLab, Bitbucket)
- [x] Banco de dados PostgreSQL (Supabase recomendado)
- [x] Node.js >= 20.0.0

---

## 📋 Variáveis de Ambiente Obrigatórias

Configure estas variáveis no dashboard da Vercel antes do deploy:

### 🔴 OBRIGATÓRIAS (Deploy falhará sem elas)

```bash
# Database
DATABASE_URL=postgresql://user:password@host.supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://user:password@host.supabase.co:5432/postgres

# JWT Secrets (mínimo 16 caracteres)
JWT_ACCESS_SECRET=seu-secret-super-seguro-min-16-chars
JWT_REFRESH_SECRET=seu-refresh-secret-super-seguro-min-16-chars
```

### 🟡 RECOMENDADAS (Com valores padrão)

```bash
# Application
NODE_ENV=production
APP_NAME=Elite Champions League
APP_URL=https://seu-dominio.vercel.app
CORS_ORIGINS=https://seu-frontend.vercel.app,https://www.seusite.com

# JWT Configuration
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=60
```

### 🟢 OPCIONAIS (Funcionalidades extras)

```bash
# File Uploads (Supabase Storage)
UPLOAD_PROVIDER=supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-key
SUPABASE_STORAGE_BUCKET=ecl-assets
UPLOAD_MAX_SIZE_MB=5

# Email (quando configurar provedor de email)
MAIL_PROVIDER=none
MAIL_FROM=noreply@ecl.com

# Admin Bootstrap (para seed inicial)
ADMIN_BOOTSTRAP_EMAIL=admin@ecl.com
ADMIN_BOOTSTRAP_USERNAME=admin
ADMIN_BOOTSTRAP_PASSWORD=SenhaSegura@123
```

### 🔒 VARIÁVEL AUTOMÁTICA (Não configure manualmente)

```bash
SERVERLESS=true  # ← Configurado automaticamente pelo vercel.json
```

---

## 🛠️ Configurações de Build na Vercel

### Framework Preset
```
Other
```

### Build Command
```bash
npm run vercel-build
```

### Output Directory
```
.
```

### Install Command
```bash
npm install
```

### Root Directory
```
Backend
```

---

## 📦 Deploy via Git (Recomendado)

### 1. Conecte o Repositório

1. Acesse https://vercel.com/new
2. Selecione seu repositório Git
3. Configure o **Root Directory**: `Backend`
4. Clique em **Configure Project**

### 2. Configure Variáveis de Ambiente

Na seção **Environment Variables**, adicione:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
APP_URL=https://seu-projeto.vercel.app
CORS_ORIGINS=https://seu-frontend.vercel.app
```

### 3. Deploy

Clique em **Deploy** e aguarde.

**Deploy automático:** Todo push para `main` será deployado automaticamente.

---

## 💻 Deploy via CLI da Vercel

### 1. Instalar CLI

```bash
npm install -g vercel
```

### 2. Login

```bash
vercel login
```

### 3. Configurar Variáveis (primeira vez)

```bash
# Acesse o diretório do backend
cd Backend

# Adicione variáveis uma por uma
vercel env add DATABASE_URL production
vercel env add JWT_ACCESS_SECRET production
vercel env add JWT_REFRESH_SECRET production
# ... adicione todas as obrigatórias
```

Ou use o dashboard: https://vercel.com/[seu-usuario]/[projeto]/settings/environment-variables

### 4. Deploy

```bash
# Deploy de produção
vercel --prod

# Ou apenas
vercel deploy --prod
```

---

## 🗄️ Configurar Banco de Dados (Supabase)

### 1. Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Crie um novo projeto
3. Aguarde inicialização (2-3 minutos)

### 2. Obter Connection Strings

No dashboard Supabase:
- **Settings** → **Database** → **Connection string**

**DATABASE_URL (Pooling):**
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**DIRECT_URL (Direct):**
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

⚠️ Substitua `[PASSWORD]` pela senha do projeto!

### 3. Rodar Migrations

**Localmente (primeira vez):**
```bash
cd Backend
npm run prisma:migrate:deploy
```

**Ou via Vercel após primeiro deploy:**
```bash
vercel env pull .env.production
npm run prisma:migrate:deploy
```

### 4. Seed do Banco (Opcional)

```bash
npm run prisma:seed
```

---

## 🧪 Testar Deploy

### 1. Health Check

```bash
curl https://seu-projeto.vercel.app/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2024-10-19T...",
  "uptime": 123.456,
  "database": "connected"
}
```

### 2. Ping

```bash
curl https://seu-projeto.vercel.app/ping
```

### 3. API Docs

Acesse no navegador:
```
https://seu-projeto.vercel.app/docs
```

### 4. Teste de Auth

```bash
# Registro
curl -X POST https://seu-projeto.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "username": "teste",
    "password": "Senha@123",
    "displayName": "Usuário Teste"
  }'

# Login
curl -X POST https://seu-projeto.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "Senha@123"
  }'
```

---

## 📊 Monitoramento

### Logs em Tempo Real

```bash
vercel logs --follow
```

Ou acesse:
```
https://vercel.com/[usuario]/[projeto]/logs
```

### Métricas

```
https://vercel.com/[usuario]/[projeto]/analytics
```

---

## 🔧 Troubleshooting

### ❌ Erro: "DATABASE_URL is required"

**Solução:** Configure a variável `DATABASE_URL` nas environment variables da Vercel.

### ❌ Erro: "JWT_ACCESS_SECRET deve ter pelo menos 16 caracteres"

**Solução:** Use um secret maior. Exemplo:
```bash
openssl rand -base64 32
```

### ❌ Erro: "Cannot connect to database"

**Causas:**
1. `DATABASE_URL` incorreta
2. Firewall do Supabase bloqueando Vercel
3. Senha incorreta

**Solução:**
- Verifique a connection string
- Supabase permite conexões de qualquer IP por padrão
- Confirme a senha no Supabase dashboard

### ❌ Erro: Cold Start Timeout

**Solução:** Aumente `maxDuration` em `vercel.json`:
```json
{
  "functions": {
    "api/index.js": {
      "maxDuration": 30  // ← Aumente para 30s
    }
  }
}
```

### ❌ CORS Error no Frontend

**Solução:** Adicione o domínio do frontend em `CORS_ORIGINS`:
```bash
CORS_ORIGINS=https://seu-frontend.vercel.app,https://www.seusite.com
```

---

## 🔄 Atualizar Deploy

### Via Git (Automático)

```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

Deploy automático será iniciado.

### Via CLI

```bash
vercel --prod
```

---

## 🎯 Checklist Final

Antes de considerar o deploy completo:

- [ ] Todas variáveis obrigatórias configuradas
- [ ] Migrations do Prisma rodadas
- [ ] Health check retornando 200
- [ ] Documentação (/docs) acessível
- [ ] Auth funcionando (registro e login)
- [ ] CORS configurado para o frontend
- [ ] Logs sendo monitorados
- [ ] Domínio customizado configurado (opcional)
- [ ] SSL ativo (automático na Vercel)

---

## 📚 Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://app.supabase.com
- **Documentação Vercel:** https://vercel.com/docs
- **Documentação Prisma:** https://www.prisma.io/docs

---

## 🎉 Deploy Concluído!

Seu backend Express está rodando na Vercel! 🚀

**Próximos passos:**
1. Configurar domínio customizado
2. Implementar módulos restantes (Users, Teams, etc.)
3. Configurar provedor de email
4. Adicionar monitoring (Sentry, LogRocket)
5. Configurar CI/CD com GitHub Actions
