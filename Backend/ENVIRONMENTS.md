# 🌍 Guia de Ambientes - ECL Backend

## Ambientes Disponíveis

### 🟢 Desenvolvimento Local (`.env` / `.env.development`)
**Quando usar:** Desenvolvimento local na sua máquina

**Configurações:**
- `NODE_ENV=development`
- `CORS_ORIGINS=http://localhost:3000`
- `UPLOAD_PROVIDER=local` (salva em `./uploads`)
- `SERVERLESS=false`
- Banco: Supabase (shared com produção)
- Rate limits: 100 req/min (mais permissivo)

**Como rodar:**
```bash
npm run dev
# Usa automaticamente .env
```

---

### 🔵 Produção (`.env.production`)
**Quando usar:** Deploy no Vercel

**Configurações:**
- `NODE_ENV=production`
- `CORS_ORIGINS=https://ecl-official.vercel.app`
- `UPLOAD_PROVIDER=supabase` (Supabase Storage)
- `SERVERLESS=true`
- Banco: Supabase (shared com dev)
- Rate limits: 60 req/min

**Como configurar no Vercel:**
1. Dashboard do projeto → Settings → Environment Variables
2. Copie as variáveis de `.env.production`
3. Marque: Production, Preview, Development
4. Redeploy

---

## 📋 Variáveis Críticas

### Obrigatórias (Todos os ambientes):
```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

### Específicas de Produção:
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Específicas de Dev:
```bash
ADMIN_BOOTSTRAP_EMAIL=admin@ecl.local
ADMIN_BOOTSTRAP_PASSWORD=ChangeMe!Admin2025
```

---

## 🔐 Segurança

### ✅ NUNCA commitar:
- `.env` (principal)
- Secrets reais
- Service role keys no git

### ✅ PODE commitar:
- `.env.example`
- `.env.development` (sem secrets reais)
- `.env.production` (template, sem secrets reais)

---

## 🚀 Comandos Rápidos

```bash
# Desenvolvimento local
npm run dev

# Testar configuração de produção localmente
npm run dev:prod

# Build
npm run build

# Prisma
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

---

## 🐛 Troubleshooting

### Backend não inicia localmente?
1. Verifique se `.env` existe
2. Confirme DATABASE_URL e JWT secrets
3. Rode: `npx tsx watch --env-file=.env src/server.ts`

### Erro de CORS?
- Dev: `CORS_ORIGINS=http://localhost:3000`
- Prod: `CORS_ORIGINS=https://ecl-official.vercel.app`

### Upload não funciona?
- Dev: `UPLOAD_PROVIDER=local`
- Prod: `UPLOAD_PROVIDER=supabase` + configure SUPABASE_SERVICE_ROLE_KEY
