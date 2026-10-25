# ECL Picks & Bans - Sistema de Pick/Ban em Tempo Real

Sistema standalone para treinos de pick & ban de mapas entre times, com sincronização em tempo real via WebSocket.

## � Estrutura do Projeto

```
picks-and-bans/
├── backend/          # API + WebSocket (Node.js + Express + Socket.io)
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/         # Interface (Next.js + React + TailwindCSS)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.local
├── DEPLOY.md         # Guia completo de deploy
└── README.md         # Este arquivo
```

## �🚀 Como Rodar Localmente

### 1. Backend (API + WebSocket)

```bash
cd backend
npm install
npm start
```

Servidor rodará na porta **3003**

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend rodará na porta **3002**

### 3. Acessar

- **Admin** (criar sessões): http://localhost:3002
- **Sessões**: Links gerados pelo admin

## 📋 Fluxo de Uso

1. **Admin** acessa http://localhost:3002
2. **Admin** digita nomes dos times e gera link
3. **Líder Time A** acessa link → digita nickname → seleciona Time A
4. **Líder Time B** acessa link → digita nickname → seleciona Time B
5. Ambos fazem pick/ban em tempo real conforme a vez

## 🔧 Tecnologias

- **Frontend**: Next.js 15, React 19, Socket.io-client, TailwindCSS
- **Backend**: Node.js, Express, Socket.io
- **Sincronização**: WebSocket em tempo real

## 🌐 Deploy

### Backend (Vercel ou qualquer Node.js host)

Variáveis de ambiente necessárias:
- `PORT` (padrão: 3003)
- `CLIENT_URL` (URL do frontend para CORS)

### Frontend (Vercel)

Variável de ambiente necessária:
- `NEXT_PUBLIC_API_URL` (URL do backend)

## � Variáveis de Ambiente

### Backend (`backend/.env`)
```env
PORT=3003
CLIENT_URL=http://localhost:3002
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3003
```
