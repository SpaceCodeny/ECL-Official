const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || 'Erro desconhecido' };
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Erro de conexão com o servidor' };
    }
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<any>('/api/v1/auth/me');
  }

  // Tournaments
  async getTournaments() {
    return this.request<any[]>('/api/v1/tournaments');
  }

  async createTournament(data: any) {
    return this.request<any>('/api/v1/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTournament(id: string) {
    return this.request<any>(`/api/v1/tournaments/${id}`);
  }

  async addTeamToTournament(tournamentId: string, teamId: string, pot?: number) {
    return this.request<any>(`/api/v1/tournaments/${tournamentId}/teams`, {
      method: 'POST',
      body: JSON.stringify({ teamId, pot }),
    });
  }

  // Teams
  async getTeams() {
    return this.request<any[]>('/api/v1/teams');
  }

  async createTeam(data: any) {
    return this.request<any>('/api/v1/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTeam(id: string) {
    return this.request<any>(`/api/v1/teams/${id}`);
  }

  // Draw Sessions
  async createDrawSession(data: {
    tournamentId: string;
    method: string;
    groupsCount: number;
    teamsPerGroup: number;
    teamIds: string[];
  }) {
    return this.request<any>('/api/v1/draw/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async executeDraw(sessionId: string) {
    return this.request<any>(`/api/v1/draw/sessions/${sessionId}/execute`, {
      method: 'POST',
    });
  }

  async getDrawSession(sessionId: string) {
    return this.request<any>(`/api/v1/draw/sessions/${sessionId}`);
  }

  async publishResults(sessionId: string) {
    return this.request<any>(`/api/v1/draw/sessions/${sessionId}/publish`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient(API_URL);
export default api;
