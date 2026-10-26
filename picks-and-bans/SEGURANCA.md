# 🔐 Segurança - Picks & Bans Admin

## Autenticação do Painel Admin

O painel admin está protegido com autenticação JWT (JSON Web Token).

---

## 🔑 Credenciais Padrão (Desenvolvimento)

Para desenvolvimento/testes locais:

- **Usuário:** `admin`
- **Senha:** `admin123`
- **URL:** `http://localhost:3002/login`

⚠️ **IMPORTANTE:** Essas credenciais são apenas para desenvolvimento!

---

## 🚀 Configuração para Produção

### 1. Gerar Secret JWT Forte

Use um gerador de senha forte (mínimo 32 caracteres):

```bash
# Exemplo de geração de secret aleatório
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Adicione no Vercel (backend):
```
JWT_SECRET=seu_secret_aleatorio_forte_aqui
```

### 2. Definir Credenciais Admin

#### Opção A: Senha Simples (Desenvolvimento)

Deixe `ADMIN_PASSWORD_HASH` vazio e use senha `admin123` no login.

#### Opção B: Hash Bcrypt (Produção - Recomendado)

**Passo 1:** Gerar hash da senha desejada

Crie um arquivo temporário `generate-hash.js`:

```javascript
const bcrypt = require('bcryptjs');

const senha = 'SuaSenhaForteAqui123!'; // ALTERE AQUI
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(senha, salt);

console.log('Hash gerado:');
console.log(hash);
```

Execute:
```bash
cd picks-and-bans/backend
node generate-hash.js
```

**Passo 2:** Adicione as variáveis no Vercel (backend):

```
ADMIN_USERNAME=seu_usuario_admin
ADMIN_PASSWORD_HASH=hash_gerado_no_passo_anterior
```

**⚠️ NÃO COMMITE O ARQUIVO `generate-hash.js` COM A SENHA!**

---

## 📋 Checklist de Deploy Seguro

### Backend:
- [ ] `JWT_SECRET` definido (mínimo 32 caracteres aleatórios)
- [ ] `ADMIN_USERNAME` personalizado
- [ ] `ADMIN_PASSWORD_HASH` com hash bcrypt de senha forte
- [ ] `CLIENT_URL` configurado
- [ ] `ECL_API_URL` configurado
- [ ] `ECL_FRONTEND_URL` configurado

### Frontend:
- [ ] `NEXT_PUBLIC_API_URL` apontando para backend correto
- [ ] Remover ou comentar info de credenciais de desenvolvimento na página de login

---

## 🔒 Boas Práticas

1. **JWT Secret:**
   - Mínimo 32 caracteres
   - Aleatório e complexo
   - Nunca compartilhar ou commitar

2. **Senha Admin:**
   - Mínimo 12 caracteres
   - Combinação de letras maiúsculas, minúsculas, números e símbolos
   - Não usar senhas comuns ou palavras do dicionário
   - Usar hash bcrypt em produção

3. **Token JWT:**
   - Válido por 24 horas
   - Armazenado no localStorage do navegador
   - Enviado no header Authorization: Bearer <token>

4. **Rotação de Secrets:**
   - Trocar JWT_SECRET periodicamente
   - Trocar senha admin periodicamente
   - Após troca, todos os tokens antigos ficam inválidos

---

## 🛡️ Como Trocar as Credenciais

### 1. Trocar JWT Secret:

1. Gere novo secret forte
2. Atualize `JWT_SECRET` na Vercel (backend)
3. Redeploy do backend
4. Todos os usuários precisarão fazer login novamente

### 2. Trocar Senha Admin:

1. Gere novo hash bcrypt (use `generate-hash.js`)
2. Atualize `ADMIN_PASSWORD_HASH` na Vercel (backend)
3. Redeploy do backend
4. Use a nova senha no login

---

## 📱 Fluxo de Autenticação

```
┌──────────┐                ┌──────────┐                ┌──────────┐
│          │   POST /login  │          │   JWT Token    │          │
│ Frontend │──────────────► │  Backend │───────────────►│ Frontend │
│  (Login) │  user + pass   │          │  (24h válido)  │  (Admin) │
└──────────┘                └──────────┘                └──────────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │ Verifica user │
                          │ Verifica hash │
                          │ Gera JWT      │
                          └───────────────┘
```

---

## ❓ FAQ

**Q: Como faço para alterar o tempo de expiração do token?**
A: No `server.js`, linha `expiresIn: '24h'` - altere para o tempo desejado (ex: '12h', '7d')

**Q: Esqueci a senha do admin, como recupero?**
A: Gere um novo hash bcrypt e atualize a variável `ADMIN_PASSWORD_HASH` na Vercel

**Q: O token expira e o usuário precisa fazer login novamente?**
A: Sim, após 24h o token expira e é necessário fazer login novamente

**Q: É seguro armazenar o token no localStorage?**
A: Para um painel admin interno, sim. Para aplicações com dados sensíveis, considere usar httpOnly cookies

---

## 🆘 Suporte

Em caso de problemas com autenticação:

1. Verifique se todas as variáveis de ambiente estão configuradas
2. Verifique os logs do backend na Vercel
3. Limpe o localStorage do navegador (F12 → Application → Local Storage → Clear)
4. Tente fazer login novamente

---

**Elite Champions League - Sistema de Picks & Bans**
