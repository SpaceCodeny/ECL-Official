# Deploy — Elite Champions League

## Arquitetura de produção

```
Vercel (Frontend Next.js)
    ↕ HTTPS / REST + WebSocket
Railway ou Render (Backend NestJS)
    ↕ PostgreSQL (connection pooler pgBouncer)
Supabase (PostgreSQL gerenciado + Storage)
```

---

## Backend — Railway ou Render

### Pré-requisitos
- Node.js 20+
- Supabase project criado (banco PostgreSQL)
- Variáveis de ambiente configuradas no painel do Railway/Render

### Variáveis de ambiente obrigatórias

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Geralmente automático no Railway (`$PORT`) |
| `APP_URL` | URL pública do backend (ex.: `https://ecl-api.railway.app`) |
| `CORS_ORIGINS` | URL do frontend Vercel, separado por vírgula |
| `DATABASE_URL` | Connection Pooler do Supabase — porta **6543** com `?pgbouncer=true` |
| `DIRECT_URL` | Direct Connection do Supabase — porta **5432** (para migrations) |
| `JWT_ACCESS_SECRET` | Gere com `node -e "require('crypto').randomBytes(64).toString('base64')"` |
| `JWT_REFRESH_SECRET` | Idem |
| `UPLOAD_PROVIDER` | `supabase` em produção |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase (Project Settings → API) |
| `SUPABASE_STORAGE_BUCKET` | `ecl-assets` (criar bucket público no Supabase Storage) |

### Formato das URLs do Supabase

```bash
# Connection Pooler (pgBouncer — transaction mode) — para DATABASE_URL
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct Connection — para DIRECT_URL (migrations, prisma studio)
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

> O `?pgbouncer=true` desabilita prepared statements nomeados no driver Prisma, necessário para funcionar com o pgBouncer em transaction mode.

### Build Command
```bash
npm run build
```

### Start Command
```bash
npx prisma migrate deploy && node dist/main
```

> `prisma migrate deploy` aplica apenas migrações pendentes sem criar novas. Seguro rodar a cada deploy.

### Ordem de primeiro deploy
1. Subir o serviço com as variáveis configuradas
2. O comando `prisma migrate deploy` cria todas as tabelas no banco Supabase
3. Rodar o seed manualmente **uma vez** (via Railway shell ou comando customizado):
   ```bash
   npx ts-node prisma/seed.ts
   ```

---

## Supabase Storage — bucket `ecl-assets`

1. Acesse o projeto Supabase → Storage
2. Crie um bucket chamado `ecl-assets`
3. Marque como **Public** (logos de equipes precisam ser acessíveis publicamente)
4. Nas políticas (Policies), permita `SELECT` para `anon` (leitura pública)
5. O upload é feito server-side com `service_role` key — não exposta no frontend

---

## Frontend — Vercel

### Variáveis de ambiente

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL do backend no Railway + `/api/v1` (ex.: `https://ecl-api.railway.app/api/v1`) |
| `NEXT_PUBLIC_WS_URL` | URL do backend sem path (ex.: `https://ecl-api.railway.app`) |
| `NEXT_PUBLIC_ENV` | `production` |

### Configurações do projeto Vercel
- Framework preset: **Next.js**
- Build command: `npm run build` (dentro de `Frontend/`)
- Root directory: `Frontend`
- Node.js version: 20.x

### WebSocket no Vercel
O Vercel não suporta WebSockets persistentes nativamente (serverless). O frontend fará conexão Socket.IO com o backend no Railway/Render — isso funciona porque o cliente se conecta ao domínio do backend, não ao Vercel.

---

## Segurança antes de ir para produção

- [ ] `NODE_ENV=production`
- [ ] Segredos JWT rotacionados (nunca os defaults)
- [ ] `CORS_ORIGINS` apenas com o domínio Vercel real
- [ ] `UPLOAD_PROVIDER=supabase`
- [ ] `MAIL_PROVIDER=smtp` com provedor real (ou manter `none` e avisar o usuário)
- [ ] Bucket Supabase Storage criado e com políticas corretas
- [ ] `prisma migrate deploy` executado com sucesso
- [ ] Senha do admin de bootstrap alterada após primeiro login

---

## Checklist de rollback

Se um deploy falhar:
1. Reverter no Railway/Render para o deploy anterior (botão "Rollback")
2. Migrations são cumulativas — não há rollback automático de schema
3. Para desfazer uma migration: criar uma nova migration que reverte as alterações
4. Nunca usar `prisma migrate reset` em produção
