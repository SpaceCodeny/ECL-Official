const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3002',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Armazenamento em memória das sessões
// NOTA: Em produção Serverless, isso será perdido entre invocações
// Para produção real, use um banco de dados (Redis, MongoDB, etc.)
const sessions = new Map();

// Mapa de sequência do Pick & Ban
const SEQUENCE = [
  { team: 'A', action: 'BAN' },
  { team: 'B', action: 'BAN' },
  { team: 'A', action: 'PICK' },
  { team: 'B', action: 'PICK' },
  { team: 'B', action: 'BAN' },
  { team: 'A', action: 'BAN' },
];

const MAPS = ['Breeze', 'Dune', 'Hanami', 'Prision', 'Province', 'Rust', 'Sakura', 'Sandstone'];

// ==================== ROTAS HTTP ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sessions: sessions.size });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', sessions: sessions.size });
});

// Criar nova sessão
app.post('/api/sessions', (req, res) => {
  const { teamAName, teamBName } = req.body;

  if (!teamAName || !teamBName) {
    return res.status(400).json({ error: 'Nomes dos times são obrigatórios' });
  }

  const sessionId = generateSessionId();
  const session = {
    id: sessionId,
    teamA: {
      id: 'A',
      name: teamAName,
      tag: teamAName.substring(0, 4).toUpperCase(),
      leader: null,
    },
    teamB: {
      id: 'B',
      name: teamBName,
      tag: teamBName.substring(0, 4).toUpperCase(),
      leader: null,
    },
    actions: [],
    currentTurn: 'A',
    currentAction: 'BAN',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    lastUpdate: Date.now(),
  };

  sessions.set(sessionId, session);

  res.json({ sessionId, session });
});

// Buscar sessão por ID
app.get('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  res.json(session);
});

// Entrar na sessão (definir líder e time)
app.post('/api/sessions/:id/join', (req, res) => {
  const { id } = req.params;
  const { team, nickname } = req.body;

  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  if (team !== 'A' && team !== 'B') {
    return res.status(400).json({ error: 'Time inválido' });
  }

  if (!nickname || nickname.trim().length === 0) {
    return res.status(400).json({ error: 'Nickname é obrigatório' });
  }

  // Definir líder do time (se ainda não tiver)
  const teamKey = team === 'A' ? 'teamA' : 'teamB';
  if (!session[teamKey].leader) {
    session[teamKey].leader = nickname.trim();
  }

  session.lastUpdate = Date.now();
  sessions.set(id, session);

  res.json({ success: true, session });
});

// Fazer uma ação (BAN ou PICK)
app.post('/api/sessions/:id/action', (req, res) => {
  const { id } = req.params;
  const { team, map } = req.body;

  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  if (session.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'Sessão já finalizada' });
  }

  if (session.currentTurn !== team) {
    return res.status(400).json({ error: 'Não é a vez deste time' });
  }

  // Verificar se o mapa já foi usado
  const usedMaps = session.actions.map((a) => a.map);
  if (usedMaps.includes(map)) {
    return res.status(400).json({ error: 'Mapa já foi usado' });
  }

  // Adicionar ação
  const newAction = {
    map,
    team: session.currentTurn,
    action: session.currentAction,
    order: session.actions.length + 1,
  };

  session.actions.push(newAction);

  // Verificar se completou as 6 ações
  if (session.actions.length === 6) {
    // Encontrar os 2 deciders (mapas que sobraram) - agora são 8 mapas total
    const allUsedMaps = session.actions.map((a) => a.map);
    const remainingMaps = MAPS.filter((m) => !allUsedMaps.includes(m));

    // Adicionar os 2 mapas restantes como deciders
    if (remainingMaps.length >= 1) {
      session.actions.push({
        map: remainingMaps[0],
        team: 'A',
        action: 'PICK',
        order: 7,
      });
    }
    
    if (remainingMaps.length >= 2) {
      session.actions.push({
        map: remainingMaps[1],
        team: 'B',
        action: 'PICK',
        order: 8,
      });
    }

    session.status = 'COMPLETED';
    session.completedAt = new Date().toISOString();
  } else {
    // Atualizar próxima jogada
    const nextIndex = session.actions.length;
    session.currentTurn = SEQUENCE[nextIndex].team;
    session.currentAction = SEQUENCE[nextIndex].action;
  }

  session.lastUpdate = Date.now();
  sessions.set(id, session);

  res.json({ success: true, session });
});

// Resetar sessão
app.post('/api/sessions/:id/reset', (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  session.actions = [];
  session.currentTurn = 'A';
  session.currentAction = 'BAN';
  session.status = 'IN_PROGRESS';
  session.lastUpdate = Date.now();
  delete session.completedAt;

  sessions.set(id, session);

  res.json({ success: true, session });
});

// Polling endpoint - substitui WebSocket
app.get('/api/sessions/:id/poll', (req, res) => {
  const { id } = req.params;
  const session = sessions.get(id);

  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada' });
  }

  res.json(session);
});

// ==================== FUNÇÕES AUXILIARES ====================

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15);
}

// ==================== SERVIDOR ====================

const PORT = process.env.PORT || 3003;

// Somente inicia servidor local se não estiver no Vercel
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor Picks & Bans rodando na porta ${PORT}`);
    console.log(`📡 Modo: Polling (compatível com Vercel)`);
  });
}

// Exporta para Vercel Serverless
module.exports = app;
