# 👑 Sistema Super Admin - ECL Picks & Bans

## Visão Geral

Sistema completo de gerenciamento com **3 níveis de acesso**:

1. **Super Admin** - Gerencia admins e visualiza métricas (NÃO cria sessões)
2. **Admin** - Cria sessões de picks & bans
3. **Jogadores** - Participam das sessões

---

## 🎯 Hierarquia de Permissões

### 👑 Super Admin (ECL-master)
**O que PODE fazer:**
- ✅ Criar novos admins
- ✅ Suspender admins
- ✅ Reativar admins suspensos
- ✅ Deletar admins
- ✅ Visualizar métricas gerais
- ✅ Ver histórico de todas as sessões
- ✅ Ver logs de atividades
- ✅ Ver quem criou cada sessão

**O que NÃO PODE fazer:**
- ❌ Criar sessões de picks & bans
- ❌ Gerar links para times

### 👤 Admin (Criado pelo Super Admin)
**O que PODE fazer:**
- ✅ Criar sessões de picks & bans
- ✅ Gerar links para times
- ✅ Selecionar times do banco ECL
- ✅ Fazer logout

**O que NÃO PODE fazer:**
- ❌ Criar outros admins
- ❌ Suspender/deletar admins
- ❌ Ver métricas globais

### 🎮 Jogadores
**O que PODE fazer:**
- ✅ Acessar sessão via link
- ✅ Escolher time e nickname
- ✅ Executar picks & bans
- ✅ Ver resultados

---

## 🔐 Credenciais

### Super Admin (Fixo)
```
Usuário: ECL-master
Senha: ECL@2026
Role: super_admin
URL: https://peaks-and-bans.vercel.app/super-admin
```

**Observações:**
- NÃO pode ser deletado
- Sempre ativo
- Único com acesso ao painel `/super-admin`

### Admins (Dinâmicos)
Criados pelo Super Admin via interface.
- Cada admin tem username único
- Senha definida na criação (mínimo 6 caracteres)
- Podem ser suspensos/reativados
- Podem ser deletados
- URL: https://peaks-and-bans.vercel.app/admin

---

## 📊 Painel Super Admin

### Aba: Métricas
Exibe estatísticas em tempo real:
- **Sessões Totais**: Total de sessões criadas
  - ✓ Completas
  - ⏳ Em andamento
- **Administradores**: Total de admins
  - ✓ Ativos
  - ✗ Suspensos
- **Logs**: Número de atividades registradas

### Aba: Admins
Gerenciamento completo de administradores:
- **Criar Admin**: Botão para adicionar novo admin
  - Campo: Usuário
  - Campo: Senha (mín. 6 caracteres)
- **Lista de Admins**: Cards com cada admin
  - Nome do usuário
  - Status (Ativo/Suspenso)
  - Data de criação
  - Ações:
    - 🟡 Suspender (se ativo)
    - 🟢 Reativar (se suspenso)
    - 🔴 Deletar

### Aba: Sessões
Histórico completo de todas as sessões:
- **Team A vs Team B**
- **Status**: Completa / Em Andamento
- **Admin que criou**
- **Data/hora de criação**
- **Ações executadas**: Lista de mapas banidos/escolhidos
  - 🚫 Banidos (vermelho)
  - ✓ Escolhidos (verde)
  - ⭐ Decider (dourado)

### Aba: Logs
Registro de todas as atividades (50 mais recentes):
- Data/hora
- Usuário que executou
- Ação realizada
- Detalhes

**Tipos de ações logadas:**
- LOGIN
- CREATE_ADMIN
- SUSPEND_ADMIN
- ACTIVATE_ADMIN
- DELETE_ADMIN
- CREATE_SESSION

---

## 🚀 Fluxo Completo

### 1. Super Admin cria Admin
```
1. Super Admin faz login
2. Acessa /super-admin
3. Clica em "Criar Admin"
4. Preenche usuário e senha
5. Clica em "Criar"
6. Admin criado e ativo
```

### 2. Admin cria Sessão
```
1. Admin faz login
2. Acessa /admin
3. Seleciona times (do banco ou manual)
4. Clica em "Criar Sessão"
5. Link gerado
6. Compartilha com jogadores
```

### 3. Super Admin monitora
```
1. Super Admin acessa /super-admin
2. Vê métricas atualizadas
3. Visualiza sessões criadas
4. Monitora atividades dos admins
5. Suspende/reativa conforme necessário
```

---

## 🛠️ API Endpoints

### Super Admin (Requer role: super_admin)

#### GET /api/super/metrics
Retorna métricas gerais
```json
{
  "sessions": { "total": 10, "completed": 8, "inProgress": 2 },
  "admins": { "total": 3, "active": 2, "suspended": 1 },
  "logs": 45
}
```

#### GET /api/super/admins
Lista todos os admins
```json
{
  "admins": [
    {
      "id": "admin-1234",
      "username": "Nexus",
      "role": "admin",
      "status": "active",
      "createdAt": "2026-10-26T..."
    }
  ]
}
```

#### POST /api/super/admins
Cria novo admin
```json
{
  "username": "NovoAdmin",
  "password": "senha123"
}
```

#### PUT /api/super/admins/:id/suspend
Suspende admin

#### PUT /api/super/admins/:id/activate
Reativa admin

#### DELETE /api/super/admins/:id
Deleta admin

#### GET /api/super/sessions
Lista todas as sessões com detalhes

#### GET /api/super/logs?limit=50
Retorna logs de atividades

### Admin (Requer role: admin)

#### POST /api/sessions
Cria nova sessão de picks & bans
```json
{
  "teamAName": "Team Liquid",
  "teamBName": "FURIA",
  "teamALogo": "https://...",
  "teamBLogo": "https://...",
  "teamATag": "TL",
  "teamBTag": "FUR"
}
```

---

## 🔒 Segurança

### Autenticação
- JWT com expiração de 24 horas
- Tokens armazenados no localStorage
- Verificação em todas as rotas protegidas

### Autorização
- Middleware `requireSuperAdmin`: Apenas super_admin
- Middleware `requireAdmin`: admin ou super_admin
- Super Admin NÃO pode criar sessões (regra de negócio)

### Senhas
- Hash bcrypt (salt rounds = 10)
- Nunca armazenadas em texto plano
- Mínimo 6 caracteres

### Logs
- Todas as ações administrativas são logadas
- Timestamp, usuário, ação e detalhes
- Auditoria completa

---

## 📦 Deploy

### Backend (.env ou Vercel)

```env
# Super Admin (Fixo)
SUPER_ADMIN_USERNAME=ECL-master
SUPER_ADMIN_PASSWORD_HASH=$2a$10$kVoFrVjAAt1lgk9/0bKd9.CtQcELjmn2WRrd4.Hzcz8grkmxJWVgS

# Admin Padrão (Opcional - pode ser criado via interface)
ADMIN_1_USERNAME=Nexus
ADMIN_1_PASSWORD_HASH=$2a$10$y/OJZdZFCkeUTcPQEhCHoOFHty9niHw45efEYP40JLYPSXRYURUVG

# Outros
CLIENT_URL=https://peaks-and-bans.vercel.app
ECL_API_URL=https://ecl-backend-six.vercel.app
ECL_FRONTEND_URL=https://ecl-official.vercel.app
JWT_SECRET=ecl-picks-bans-2024-secret-key-very-secure-random-string
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://peaks-and-bans-backend.vercel.app
```

---

## 🧪 Testes Locais

### 1. Iniciar Backend
```bash
cd backend
npm run dev
# Rodando em http://localhost:3003
```

### 2. Iniciar Frontend
```bash
cd frontend
npm run dev
# Rodando em http://localhost:3002
```

### 3. Testar Login Super Admin
```
URL: http://localhost:3002/login
Usuário: ECL-master
Senha: ECL@2026
Espera redirecionar para: /super-admin
```

### 4. Criar Admin
```
1. No painel super-admin, clicar em "Criar Admin"
2. Usuário: TestAdmin
3. Senha: test123
4. Criar
```

### 5. Logout e Login como Admin
```
1. Logout
2. URL: http://localhost:3002/login
3. Usuário: TestAdmin
4. Senha: test123
5. Espera redirecionar para: /admin
```

### 6. Testar Sessão
```
1. No painel admin, criar sessão
2. Abrir link em navegador anônimo
3. Participar como jogador
```

---

## ⚠️ Observações Importantes

### Armazenamento em Memória
- ⚠️ **Sessões e admins dinâmicos** são armazenados em **memória** (Map)
- Em produção Vercel (serverless), dados são perdidos entre invocações
- **Solução para produção**: Migrar para banco de dados (MongoDB, PostgreSQL, Supabase)

### Super Admin Fixo
- Super Admin é definido via variáveis de ambiente
- NÃO é armazenado em banco/memória
- Sempre disponível
- NÃO pode ser deletado ou suspenso

### Admins Dinâmicos
- Criados via interface
- Armazenados em memória
- **Perdidos ao reiniciar servidor** (serverless)
- Para persistência: implementar banco de dados

---

## 🔄 Migração para Produção com Banco

Para uso em produção real, recomendamos:

### 1. Adicionar Prisma/MongoDB
```prisma
model Admin {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  username    String   @unique
  passwordHash String
  role        String   // "admin"
  status      String   // "active" | "suspended"
  createdAt   DateTime @default(now())
  createdBy   String
}

model Session {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  teamAName   String
  teamBName   String
  status      String
  createdAt   DateTime @default(now())
  createdBy   String
  createdById String
  actions     Json[]
}

model ActivityLog {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  timestamp DateTime @default(now())
  action    String
  userId    String
  username  String
  role      String
  details   Json
}
```

### 2. Atualizar server.js
Substituir Maps por Prisma queries

---

## 📞 Suporte

Para dúvidas ou problemas:
- Discord ECL
- Email: contato@ecl.com.br

---

**Versão**: 2.0.0 (Super Admin System)  
**Data**: 26/10/2026  
**Desenvolvido por**: Elite Champions League
