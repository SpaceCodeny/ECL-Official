# 🚀 Deploy no Vercel - Guia Rápido

## ⚠️ IMPORTANTE: Polling em vez de WebSocket

Como o Vercel não suporta WebSocket para backend, o sistema foi adaptado para usar **polling** (requisições a cada 2 segundos). Funciona perfeitamente para sincronização!

---

## 📋 Ordem de Deploy

### 1️⃣ Deploy do Backend PRIMEIRO

1. **Acesse Vercel**: https://vercel.com
2. **New Project** → Selecione repositório `ECL-Official`
3. **Configure:**
   - **Root Directory**: `picks-and-bans/backend`
   - **Framework Preset**: Other
   - **Build Command**: (deixe vazio)
   - **Output Directory**: (deixe vazio)
   - **Install Command**: `npm install`

4. **Environment Variables:**
   ```
   CLIENT_URL = (deixe vazio por enquanto, preencher depois)
   ```

5. **Deploy** → Aguarde completar

6. **Copie a URL gerada:**
   ```
   https://picks-bans-backend.vercel.app
   ```

---

### 2️⃣ Deploy do Frontend DEPOIS

1. **New Project** → Selecione repositório `ECL-Official`
2. **Configure:**
   - **Root Directory**: `picks-and-bans/frontend`
   - **Framework Preset**: Next.js (detecta automaticamente)

3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL = https://picks-bans-backend.vercel.app
   ```
   ⚠️ Use a URL do backend do passo 1 (SEM barra no final)

4. **Deploy** → Aguarde completar

5. **Copie a URL gerada:**
   ```
   https://ecl-picks-bans.vercel.app
   ```

---

### 3️⃣ Atualizar Backend

1. **Volte no projeto do Backend** no Vercel
2. **Settings** → **Environment Variables**
3. **Edite `CLIENT_URL`:**
   ```
   CLIENT_URL = https://ecl-picks-bans.vercel.app
   ```
   ⚠️ Use a URL do frontend do passo 2 (SEM barra no final)

4. **Redeploy** (Deployments → ••• → Redeploy)

---

## ✅ Teste Final

1. Acesse: `https://ecl-picks-bans.vercel.app`
2. Crie uma sessão
3. Copie o link gerado: `https://ecl-picks-bans.vercel.app/session/abc123`
4. Abra em 2 dispositivos diferentes
5. Digite nicknames e selecione times
6. Faça picks/bans → **Sincroniza a cada 2 segundos!** ⚡

---

## 📝 Variáveis de Ambiente - Resumo

### Backend
```env
CLIENT_URL=https://ecl-picks-bans.vercel.app
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://picks-bans-backend.vercel.app
```

**ATENÇÃO**: Troque pelas suas URLs reais após o deploy!

---

## 🔧 Troubleshooting

### Erro: "Sessão não encontrada"
- ✅ Verifique se `NEXT_PUBLIC_API_URL` está correto no frontend
- ✅ Teste a API: `https://seu-backend.vercel.app/health`

### Erro: CORS
- ✅ Verifique se `CLIENT_URL` está correto no backend
- ✅ Deve ser EXATAMENTE a URL do frontend (sem / no final)
- ✅ Redeploy do backend após alterar

### Sessões sumindo
- ⚠️ **NORMAL**: Vercel Serverless não mantém estado
- 💡 **Solução**: Para produção, use banco de dados (Vercel KV, MongoDB Atlas, etc.)
- 📖 Para sessões temporárias de treino, funciona perfeitamente!

---

## 💡 Diferenças do WebSocket

**WebSocket (Local):**
- Atualização instantânea
- Conexão persistente

**Polling (Vercel):**
- Atualização a cada 2 segundos
- Requisições HTTP periódicas
- Funciona perfeitamente para picks/bans! ✅

---

## 🎯 Próximos Passos (Opcional)

Para melhorar em produção:

1. **Adicionar Banco de Dados**:
   - Vercel KV (Redis)
   - MongoDB Atlas
   - Supabase

2. **Melhorar Polling**:
   - Long polling
   - Server-Sent Events (SSE)

3. **Usar Backend Dedicado** (se precisar WebSocket real):
   - Railway
   - Render
   - Fly.io

---

Pronto para fazer o deploy! 🚀
