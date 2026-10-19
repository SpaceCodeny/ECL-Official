# ✅ Configuração Supabase - ECL Backend

## 🎯 Suas Configurações Atuais

### 📦 Projeto Supabase
- **Project ID**: `xkypvykdbnaqqchnlwmd`
- **Região**: `us-west-2` (AWS Oregon)
- **URL Base**: `https://xkypvykdbnaqqchnlwmd.supabase.co`

---

## 🔗 Connection Strings Configuradas

### ✅ DATABASE_URL (Transaction Pooler - Porta 6543)
```
postgresql://postgres.xkypvykdbnaqqchnlwmd:ElitechapionsLeague@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```
- 📌 **Uso**: Aplicação em runtime (Vercel/produção)
- ⚡ **PgBouncer**: Ativado (pooling de conexões)
- 🚀 **Ideal para**: Serverless functions

### ✅ DIRECT_URL (Direct Connection - Porta 5432)
```
postgresql://postgres.xkypvykdbnaqqchnlwmd:ElitechapionsLeague@aws-1-us-west-2.pooler.supabase.com:5432/postgres
```
- 📌 **Uso**: Prisma Migrate (migrations)
- 🔧 **Conexão direta**: Sem pooling
- 📝 **Ideal para**: Alterações de schema

---

## 🗄️ Status da Configuração

| Item | Status |
|------|--------|
| Prisma Client | ✅ Gerado |
| Schema carregado | ✅ OK |
| Connection pooling | ✅ Configurado |
| Direct connection | ✅ Configurado |
| `.env` atualizado | ✅ OK |

---

## 🚀 Próximos Passos

### 1. Testar Conexão Local

```bash
cd Backend

# Verificar se conecta ao banco
npm run prisma:studio
```

Isso deve abrir o Prisma Studio no navegador conectado ao seu Supabase.

### 2. Rodar Migrations (Se necessário)

```bash
# Ver status das migrations
npx prisma migrate status

# Aplicar migrations pendentes
npm run prisma:migrate:deploy

# Ou criar uma nova migration
npm run prisma:migrate
```

### 3. Seed do Banco (Dados iniciais)

```bash
npm run prisma:seed
```

Isso criará:
- ✅ Usuário admin inicial
- ✅ Dados de exemplo (se configurado no seed)

---

## 🌐 Para Deploy na Vercel

Configure estas variáveis no dashboard da Vercel:

```bash
# Database (OBRIGATÓRIAS)
DATABASE_URL=postgresql://postgres.xkypvykdbnaqqchnlwmd:ElitechapionsLeague@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true

DIRECT_URL=postgresql://postgres.xkypvykdbnaqqchnlwmd:ElitechapionsLeague@aws-1-us-west-2.pooler.supabase.com:5432/postgres

# JWT (OBRIGATÓRIAS - Use as que estão no seu .env)
JWT_ACCESS_SECRET=vNECeqGKkP03rnAFswArmDZswWqImSrPCszYJiIUdt0ksXuyZFvEV+cbeoYR6ZNSsqtPflde/bHBFMkK5tlKDw==

JWT_REFRESH_SECRET=3rqgfYBHwxnQbzix2dcdJZ6KxP/iIRy5WApyphJUx18oAMdsUSUNi+1QtC+k+FuN3B0Pt6pBjU+BbgZaN9/bEQ==

# App (RECOMENDADAS)
NODE_ENV=production
APP_URL=https://seu-projeto.vercel.app
CORS_ORIGINS=https://seu-frontend.vercel.app

# JWT Config
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Supabase Storage (OPCIONAIS)
UPLOAD_PROVIDER=supabase
SUPABASE_URL=https://xkypvykdbnaqqchnlwmd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_STORAGE_BUCKET=ecl-assets
```

---

## 🔐 Como Obter a Service Role Key

Para uploads funcionarem em produção:

1. Acesse: https://app.supabase.com/project/xkypvykdbnaqqchnlwmd
2. **Settings** → **API**
3. Role até **Project API keys**
4. Copie a **`service_role`** (secret key)
5. Adicione em `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **NUNCA** exponha essa chave no frontend ou em repositórios públicos!

---

## 🧪 Testar Conexão

Execute para verificar se tudo está funcionando:

```bash
cd Backend

# 1. Testar conexão do Prisma
npx prisma db push --skip-generate

# 2. Iniciar servidor local
npm run dev
```

Depois acesse:
- **Health Check**: http://localhost:3001/health
- **API Docs**: http://localhost:3001/docs

Se o health check retornar `"database": "connected"`, está tudo certo! ✅

---

## 📊 Estrutura do Banco

Seu banco Supabase agora tem:

```
Database: postgres
Schema: public
Tables: (conforme seu prisma/schema.prisma)
  - User
  - UserSession
  - PasswordResetToken
  - Team
  - Tournament
  - Match
  - Registration
  - ... (etc)
```

---

## 🔧 Troubleshooting

### ❌ Erro: "Can't reach database server"

**Causas comuns:**
1. Senha incorreta
2. Projeto Supabase pausado (plano free pausa após inatividade)
3. URL incorreta

**Soluções:**
1. Confirme a senha no Supabase dashboard
2. Acesse o projeto no Supabase para "despertar" se estiver pausado
3. Verifique se copiou a URL completa (incluindo `?pgbouncer=true`)

### ❌ Erro: "SSL connection required"

**Solução:** Adicione `?sslmode=require` no final da URL:
```
...postgres?pgbouncer=true&sslmode=require
```

### ❌ Migrations falhando

**Solução:** Use `DIRECT_URL` (porta 5432) para migrations:
```bash
npx prisma migrate deploy
```

---

## ✅ Checklist

- [x] DATABASE_URL configurada (Transaction Pooler)
- [x] DIRECT_URL configurada (Direct Connection)
- [x] Prisma Client gerado
- [x] Schema carregado
- [ ] Prisma Studio testado
- [ ] Migrations aplicadas
- [ ] Seed executado
- [ ] Health check testado localmente
- [ ] Deploy na Vercel configurado

---

## 🎉 Está Pronto!

Suas connection strings estão corretamente configuradas! 🚀

**Próximos passos:**
1. Teste localmente: `npm run dev`
2. Rode migrations: `npm run prisma:migrate:deploy`
3. Execute seed: `npm run prisma:seed`
4. Configure as mesmas variáveis na Vercel
5. Faça o deploy!

---

**Documentação Supabase**: https://supabase.com/docs
**Documentação Prisma**: https://www.prisma.io/docs
