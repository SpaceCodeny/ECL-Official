import { PickBanSession } from '@/types';

// Remove barra final se existir
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003').replace(/\/$/, '');

export async function createSession(teamAName: string, teamBName: string) {
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamAName, teamBName }),
  });

  if (!response.ok) {
    throw new Error('Erro ao criar sessão');
  }

  return response.json();
}

export async function getSession(sessionId: string): Promise<PickBanSession> {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error('Sessão não encontrada');
  }

  return response.json();
}

export async function joinSession(sessionId: string, team: 'A' | 'B', nickname: string) {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team, nickname }),
  });

  if (!response.ok) {
    throw new Error('Erro ao entrar na sessão');
  }

  return response.json();
}

export async function makeAction(sessionId: string, team: 'A' | 'B', map: string) {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team, map }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao fazer ação');
  }

  return response.json();
}

export async function resetSession(sessionId: string) {
  const response = await fetch(`${API_URL}/api/sessions/${sessionId}/reset`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Erro ao resetar sessão');
  }

  return response.json();
}

export function getSocketUrl() {
  return API_URL;
}
