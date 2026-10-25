# 🚀 Quick Start - Picks & Bans

## Estrutura do Projeto

```
picks-and-bans/
├── backend/      # Servidor API + WebSocket
└── frontend/     # Interface Next.js
```

## ⚡ Início Rápido (2 comandos)

### Terminal 1 - Backend
```bash
cd backend
npm install
npm start
```
✅ Servidor rodando em `http://localhost:3003`

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```
✅ App rodando em `http://localhost:3002`

---

## 🎮 Como Usar

1. **Acesse:** http://localhost:3002
2. **Crie uma sessão** digitando nomes dos times
3. **Copie o link gerado**
4. **Abra o link em 2 dispositivos/abas diferentes**
5. **Cada pessoa:**
   - Digite seu nickname
   - Selecione seu time (A ou B)
6. **Faça os picks/bans** conforme a vez de cada time

---

## 🌐 Deploy

Ver guia completo: [DEPLOY.md](./DEPLOY.md)

**Resumo:**
- **Backend**: Deploy no Railway/Render (suporta WebSocket)
- **Frontend**: Deploy no Vercel

**Variáveis necessárias:**

Backend:
```env
PORT=3003
CLIENT_URL=https://seu-frontend.vercel.app
```

Frontend:
```env
NEXT_PUBLIC_API_URL=https://seu-backend.railway.app
```

---

## 🔧 Tecnologias

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Next.js 15, React 19, TailwindCSS
- **Comunicação**: REST API + WebSocket

---

## 📝 Ordem de Picks & Bans

1. Time A bane 1 mapa
2. Time B bane 1 mapa
3. Time A escolhe 1 mapa
4. Time B escolhe 1 mapa
5. Time B bane 1 mapa
6. Time A bane 1 mapa
7. Sistema define DECIDER (mapa restante)

---

## 💡 Dicas

- Use **2 dispositivos diferentes** para testar a sincronização em tempo real
- O **mesmo link** deve ser usado por ambos os times
- Cada pessoa faz ações **apenas quando for a vez do seu time**
- WebSocket sincroniza tudo **automaticamente**

---

## 🐛 Troubleshooting

### Erro: "Sessão não encontrada ou servidor offline"
- ✅ Verifique se o backend está rodando na porta 3003
- ✅ Teste: `curl http://localhost:3003/health`

### Erro: CORS
- ✅ Verifique `CLIENT_URL` no backend `.env`
- ✅ Deve ser exatamente a URL do frontend

### WebSocket não conecta
- ✅ Use Railway/Render para backend (não Vercel)
- ✅ Verifique logs do servidor

---

Pronto para começar! 🎮
