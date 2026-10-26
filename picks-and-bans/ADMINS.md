# 🔐 Administradores do Sistema Picks & Bans

## Credenciais de Acesso

### Admin 1: ECL-master
- **Usuário**: `ECL-master`
- **Senha**: `ECL@2026`
- **Hash bcrypt**: `$2a$10$kVoFrVjAAt1lgk9/0bKd9.CtQcELjmn2WRrd4.Hzcz8grkmxJWVgS`

### Admin 2: Nexus
- **Usuário**: `Nexus`
- **Senha**: `Nexus@2026`
- **Hash bcrypt**: `$2a$10$y/OJZdZFCkeUTcPQEhCHoOFHty9niHw45efEYP40JLYPSXRYURUVG`

---

## Permissões

Ambos os admins possuem **acesso total** ao painel administrativo:

- ✅ Criar sessões de picks & bans
- ✅ Selecionar times (do banco ECL ou manual)
- ✅ Gerar links de sessão
- ✅ Visualizar sessões ativas

---

## Configuração no Backend

O sistema suporta múltiplos admins através do array `ADMIN_USERS` no arquivo `server.js`:

```javascript
const ADMIN_USERS = [
  {
    username: 'ECL-master',
    passwordHash: process.env.ADMIN_PASSWORD_HASH_1,
  },
  {
    username: 'Nexus',
    passwordHash: process.env.ADMIN_PASSWORD_HASH_2,
  },
];
```

---

## Variáveis de Ambiente

### Local (.env)

```env
ADMIN_PASSWORD_HASH_1=$2a$10$kVoFrVjAAt1lgk9/0bKd9.CtQcELjmn2WRrd4.Hzcz8grkmxJWVgS
ADMIN_PASSWORD_HASH_2=$2a$10$y/OJZdZFCkeUTcPQEhCHoOFHty9niHw45efEYP40JLYPSXRYURUVG
```

### Vercel (Produção)

Adicione estas variáveis no painel da Vercel:

1. **ADMIN_PASSWORD_HASH_1**
   - Value: `$2a$10$kVoFrVjAAt1lgk9/0bKd9.CtQcELjmn2WRrd4.Hzcz8grkmxJWVgS`

2. **ADMIN_PASSWORD_HASH_2**
   - Value: `$2a$10$y/OJZdZFCkeUTcPQEhCHoOFHty9niHw45efEYP40JLYPSXRYURUVG`

> **Importante**: Remova as variáveis antigas `ADMIN_USERNAME` e `ADMIN_PASSWORD_HASH` se existirem.

---

## Como Adicionar Novos Admins

### 1. Gerar Hash da Senha

```bash
cd backend
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('SUA_SENHA_AQUI', 10, (err, hash) => { console.log('Hash:', hash); });"
```

### 2. Adicionar no Array ADMIN_USERS

```javascript
const ADMIN_USERS = [
  // ... admins existentes
  {
    username: 'NovoAdmin',
    passwordHash: process.env.ADMIN_PASSWORD_HASH_3,
  },
];
```

### 3. Adicionar Variável de Ambiente

Local (`.env`):
```env
ADMIN_PASSWORD_HASH_3=$2a$10$...seu_hash_aqui...
```

Vercel:
- Settings > Environment Variables
- Add: `ADMIN_PASSWORD_HASH_3` = `$2a$10$...seu_hash_aqui...`
- Redeploy

---

## Segurança

- ✅ Senhas **nunca** armazenadas em texto plano
- ✅ Hash bcrypt com **salt rounds = 10**
- ✅ JWT com expiração de **24 horas**
- ✅ Tokens validados em **todas as rotas protegidas**
- ✅ Secret JWT forte e único

---

## Testando Localmente

```bash
# 1. Certifique-se que o .env está configurado
cd backend
cat .env

# 2. Inicie o backend
npm run dev

# 3. Teste login ECL-master
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ECL-master","password":"ECL@2026"}'

# 4. Teste login Nexus
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"Nexus","password":"Nexus@2026"}'
```

Se ambos retornarem um token JWT, está funcionando! ✅

---

## Troubleshooting

### Erro: "Credenciais inválidas"

1. Verifique se o username está **exatamente** como configurado (case-sensitive)
2. Confirme que a variável de ambiente está carregada: `console.log(process.env.ADMIN_PASSWORD_HASH_1)`
3. Teste o hash manualmente:
   ```javascript
   bcrypt.compare('ECL@2026', '$2a$10$kVo...', (err, result) => console.log(result));
   ```

### Erro: "Token inválido"

1. Verifique se o `JWT_SECRET` está definido
2. Confirme que o token não expirou (24h)
3. Use o token no header: `Authorization: Bearer SEU_TOKEN_AQUI`

---

**Última atualização**: 26/10/2026
