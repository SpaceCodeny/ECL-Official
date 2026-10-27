# 🔄 Integração com Banco de Dados

## Status Atual

✅ Schema Prisma criado (`prisma/schema.prisma`)
✅ Cliente Prisma configurado (`prisma/client.js`)  
✅ Backup do server.js antigo criado (`server.memory.js.backup`)
⏳ Aguardando configuração do Supabase

## Depois de Configurar Supabase

### 1. Cole as strings de conexão no `.env`

```env
DATABASE_URL="sua-string-aqui?pgbouncer=true"
DIRECT_URL="sua-string-aqui"
```

### 2. Execute as migrations

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Crie o Super Admin no banco

Opção A - Via Prisma Studio:
```bash
npx prisma studio
```
- Abra tabela `Admin`
- Add record:
  - username: `ECL-master`
  - passwordHash: `$2a$10$kVoFrVjAAt1lgk9/0bKd9.CtQcELjmn2WRrd4.Hzcz8grkmxJWVgS`
  - role: `SUPER_ADMIN`
  - status: `ACTIVE`

Opção B - Via SQL (Supabase SQL Editor):
```sql
INSERT INTO "Admin" (id, username, "passwordHash", role, status, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'ECL-master',
  '$2a$10$kVoFrVjAAt1lgk9/0bKd9.CtQcELjmn2WRrd4.Hzcz8grkmxJWVgS',
  'SUPER_ADMIN',
  'ACTIVE',
  NOW(),
  NOW()
);
```

### 4. Atualize o server.js

Eu vou criar o novo `server.js` assim que você confirmar que o Supabase está configurado e as migrations rodaram.

O novo server.js vai:
- ✅ Buscar admins do banco (não mais memória)
- ✅ Salvar sessões no banco
- ✅ Salvar logs no banco
- ✅ Persistir tudo forever
- ✅ Funcionar em Vercel serverless

## Quando Estiver Pronto

Me avise que:
1. ✅ Projeto Supabase criado
2. ✅ DATABASE_URL e DIRECT_URL coladas no .env
3. ✅ `npx prisma migrate dev` executado com sucesso
4. ✅ Tabelas visíveis no Supabase Table Editor

Então eu atualizo o `server.js` para usar o banco! 🚀
