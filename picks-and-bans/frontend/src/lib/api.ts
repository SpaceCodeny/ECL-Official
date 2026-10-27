import { PickBanSession } from '@/types';

// Remove barra final se existir
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003').replace(/\/$/, '');

export interface Team {
  id: string;
  name: string;
  tag: string;
  logoUrl: string | null;
}

export async function getTeams(): Promise<Team[]> {
  try {
    const response = await fetch(`${API_URL}/api/teams`);
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    // Garantir que as URLs sejam absolutas do frontend da ECL
    const ECL_FRONTEND_URL = 'https://ecl-official.vercel.app';
    
    const teams = (data.teams || []).map((team: Team) => {
      let logoUrl = team.logoUrl;
      
      // Se a URL for relativa, converter para absoluta do frontend da ECL
      if (logoUrl && logoUrl.startsWith('/images/')) {
        logoUrl = `${ECL_FRONTEND_URL}${logoUrl}`;
      }
      
      return {
        ...team,
        logoUrl
      };
    });
    
    return teams;
  } catch (error) {
    console.error('Erro ao buscar times:', error);
    return [];
  }
}

export async function createSession(
  teamAName: string, 
  teamBName: string,
  teamALogo?: string | null,
  teamBLogo?: string | null,
  teamATag?: string,
  teamBTag?: string,
  seriesFormat?: 'BO1' | 'BO3' | 'BO5'
) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      teamAName, 
      teamBName,
      teamALogo,
      teamBLogo,
      teamATag,
      teamBTag,
      seriesFormat,
    }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
      window.location.href = '/login';
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao criar sessão');
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
