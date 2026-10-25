# 🚀 Guia de Deploy - Picks & Bans

## 📦 Opção 1: Deploy Separado (Recomendado)

### 1️⃣ Deploy do Backend (API + WebSocket)

**Opções de Host:**
- [Railway](https://railway.app) ⭐ **Recomendado** - Suporta WebSocket
- [Render](https://render.com) - Plano gratuito com WebSocket
- [Fly.io](https://fly.io) - Ótimo para WebSocket

#### Passos (Railway):

1. **Criar conta no Railway**
   - Acesse: https://railway.app
   - Faça login com GitHub

2. **Criar novo projeto**
   - Click "New Project" → "Deploy from GitHub repo"
   - Selecione o repositório `ECL-Official`
   - Escolha a pasta: `picks-and-bans/backend` ⚠️ **IMPORTANTE**

3. **Configurar variáveis de ambiente**
   ```
   PORT=3003
   CLIENT_URL=https://seu-frontend.vercel.app
   ```

4. **Deploy automático**
   - Railway vai detectar o `package.json` e fazer deploy
   - Copie a URL gerada (ex: `https://picks-bans-backend-production.up.railway.app`)

---

### 2️⃣ Deploy do Frontend (Next.js)

#### Passos (Vercel):

1. **Criar conta no Vercel**
   - Acesse: https://vercel.com
   - Faça login com GitHub

2. **Importar projeto**
   - Click "Add New..." → "Project"
   - Selecione o repositório `ECL-Official`
   - **Root Directory**: `picks-and-bans/frontend` ⚠️ **IMPORTANTE**

3. **Configurar variáveis de ambiente**
   ```
   NEXT_PUBLIC_API_URL=https://picks-bans-backend-production.up.railway.app
   ```
   ⚠️ **Use a URL do backend do passo 1**

4. **Build Settings** (Vercel detecta automaticamente)
   ```
   Framework Preset: Next.js
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

5. **Deploy**
   - Click "Deploy"
   - Aguarde o build (2-3 minutos)
   - Copie a URL gerada (ex: `https://ecl-picks-bans.vercel.app`)

---

### 3️⃣ Atualizar CORS no Backend

Depois do deploy do frontend, volte no Railway e atualize:

```env
CLIENT_URL=https://ecl-picks-bans.vercel.app
```

(Use a URL real do Vercel)

---

## 📦 Opção 2: Deploy Unificado (Monorepo)

Se preferir tudo junto no Vercel:

1. **Configure o `vercel.json` na raiz**
2. Backend vira Serverless Functions
3. ⚠️ **Limitação**: WebSocket não funciona em Serverless
   - Seria necessário migrar para polling ou usar serviço externo (Pusher, Ably)

**Recomendação**: Use Opção 1 para manter WebSocket funcionando.

---

## 🔗 Como os Links Funcionam no Deploy

### Geração Automática de Links

O código usa `window.location.origin`:

```typescript
// Admin cria sessão
const link = `${window.location.origin}/session/${sessionId}`;
```

**Resultado:**
- Local: `http://localhost:3002/session/abc123`
- Deploy: `https://ecl-picks-bans.vercel.app/session/abc123` ✅

### Rotas Next.js (Dynamic)

A rota `src/app/session/[id]/page.tsx` é dinâmica:
- Qualquer `/session/QUALQUER_ID` renderiza a mesma página
- O `id` é extraído via `use(params)`
- Backend busca a sessão pelo ID

---

## ✅ Checklist Final

### Backend (Railway)
- [ ] Repositório conectado
- [ ] Variável `PORT` configurada
- [ ] Variável `CLIENT_URL` com URL do frontend
- [ ] Deploy concluído
- [ ] URL do backend copiada

### Frontend (Vercel)
- [ ] Repositório conectado
- [ ] Root Directory = `picks-and-bans`
- [ ] Variável `NEXT_PUBLIC_API_URL` com URL do backend
- [ ] Deploy concluído
- [ ] URL do frontend copiada

### Teste Final
- [ ] Acesse `https://seu-frontend.vercel.app`
- [ ] Crie uma sessão
- [ ] Copie o link gerado
- [ ] Abra em 2 dispositivos diferentes
- [ ] Teste os picks/bans em tempo real

---

## 🐛 Troubleshooting

### Erro: "Sessão não encontrada ou servidor offline"

**Causa**: Frontend não consegue conectar ao backend

**Solução**:
1. Verifique se `NEXT_PUBLIC_API_URL` está correto
2. Teste o backend direto: `https://seu-backend.railway.app/health`
3. Deve retornar: `{"status":"ok","sessions":0}`

### Erro: CORS

**Causa**: Backend bloqueando requisições do frontend

**Solução**:
1. Verifique `CLIENT_URL` no backend
2. Deve ser exatamente a URL do Vercel (sem barra no final)
3. Redeploy do backend após mudança

### WebSocket não conecta

**Causa**: Backend não suporta WebSocket ou CORS

**Solução**:
1. Use Railway, Render ou Fly.io (não Vercel para backend)
2. Verifique logs do backend para erros
3. Teste WebSocket: `wscat -c wss://seu-backend.railway.app`

---

## 💰 Custos

| Serviço | Plano Gratuito | Limite |
|---------|---------------|--------|
| Railway | $5 crédito/mês | ~500 horas |
| Vercel | Hobby gratuito | Deploy ilimitado |
| Render | Free tier | 750 horas/mês |

**Total**: Grátis para começar! 🎉

---

## 📞 Suporte

Se precisar de ajuda:
1. Verifique logs no Railway/Vercel
2. Teste as URLs individualmente
3. Use DevTools → Network para debug
