/**
 * ECL Draw System - Algoritmos de Sorteio
 * Implementações criptograficamente seguras e auditáveis
 */

import crypto from 'node:crypto';

export interface Team {
  id: string;
  name: string;
  pot?: number;
}

export interface DrawConfig {
  teams: Team[];
  groupCount: number;
  teamsPerGroup?: number;
  method: 'RANDOM' | 'BALANCED' | 'POT_BASED' | 'SNAKE';
  seed?: string; // Para commit-reveal
}

export interface DrawResult {
  groups: Group[];
  revealOrder: RevealOrder[];
  metadata: {
    algorithm: string;
    timestamp: string;
    commitHash?: string;
    seed?: string;
  };
}

export interface Group {
  index: number;
  name: string;
  teams: Team[];
}

export interface RevealOrder {
  teamId: string;
  groupIndex: number;
  position: number;
  revealOrder: number;
}

/**
 * Fisher-Yates Shuffle - Implementação sem viés
 * Usa crypto.randomInt para aleatoriedade criptográfica
 */
export function fisherYatesShuffle<T>(array: T[], seed?: string): T[] {
  const result = [...array];
  
  // Se houver seed, usar para gerar índices determinísticos
  if (seed) {
    // Implementação determinística com seed (para commit-reveal)
    const hmac = crypto.createHmac('sha256', seed);
    
    for (let i = result.length - 1; i > 0; i--) {
      hmac.update(i.toString());
      const hash = hmac.digest();
      const j = Number(BigInt('0x' + hash.toString('hex')) % BigInt(i + 1));
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
  } else {
    // Aleatoriedade real usando crypto.randomInt
    for (let i = result.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1); // [0, i] inclusive
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
  }
  
  return result;
}

/**
 * Distribuição Aleatória Simples
 * Embaralha times e distribui sequencialmente entre grupos
 */
export function randomDistribution(config: DrawConfig): DrawResult {
  const { teams, groupCount, seed } = config;
  
  if (teams.length < groupCount) {
    throw new Error('Número de times menor que número de grupos');
  }
  
  const shuffled = fisherYatesShuffle(teams, seed);
  const groups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
    index: i,
    name: `Grupo ${String.fromCharCode(65 + i)}`, // A, B, C, D...
    teams: [],
  }));
  
  // Distribuir times de forma circular
  shuffled.forEach((team, idx) => {
    const groupIndex = idx % groupCount;
    groups[groupIndex]!.teams.push(team);
  });
  
  const revealOrder = generateRevealOrder(groups);
  
  return {
    groups,
    revealOrder,
    metadata: {
      algorithm: 'RANDOM',
      timestamp: new Date().toISOString(),
      seed,
    },
  };
}

/**
 * Distribuição Equilibrada
 * Garante mesma quantidade de times por grupo (ou diferença mínima)
 */
export function balancedDistribution(config: DrawConfig): DrawResult {
  const { teams, groupCount, teamsPerGroup, seed } = config;
  
  const shuffled = fisherYatesShuffle(teams, seed);
  
  // Calcular distribuição ideal
  const baseSize = Math.floor(teams.length / groupCount);
  const remainder = teams.length % groupCount;
  
  const groups: Group[] = [];
  let teamIndex = 0;
  
  for (let i = 0; i < groupCount; i++) {
    const size = i < remainder ? baseSize + 1 : baseSize;
    const groupTeams = shuffled.slice(teamIndex, teamIndex + size);
    
    groups.push({
      index: i,
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      teams: groupTeams,
    });
    
    teamIndex += size;
  }
  
  const revealOrder = generateRevealOrder(groups);
  
  return {
    groups,
    revealOrder,
    metadata: {
      algorithm: 'BALANCED',
      timestamp: new Date().toISOString(),
      seed,
    },
  };
}

/**
 * Distribuição por Potes (Pot-Based)
 * Times são divididos por potes e sorteados garantindo 1 de cada pote por grupo
 */
export function potBasedDistribution(config: DrawConfig): DrawResult {
  const { teams, groupCount, seed } = config;
  
  // Agrupar times por pote
  const pots: Map<number, Team[]> = new Map();
  
  teams.forEach(team => {
    const pot = team.pot ?? 1;
    if (!pots.has(pot)) {
      pots.set(pot, []);
    }
    pots.get(pot)!.push(team);
  });
  
  // Validar que cada pote tem pelo menos 'groupCount' times
  for (const [potNumber, potTeams] of pots.entries()) {
    if (potTeams.length < groupCount) {
      throw new Error(
        `Pote ${potNumber} tem apenas ${potTeams.length} times, mas precisa de ${groupCount}`
      );
    }
  }
  
  // Inicializar grupos
  const groups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
    index: i,
    name: `Grupo ${String.fromCharCode(65 + i)}`,
    teams: [],
  }));
  
  // Sortear cada pote
  const sortedPots = Array.from(pots.entries()).sort((a, b) => a[0] - b[0]);
  
  for (const [potNumber, potTeams] of sortedPots) {
    const shuffled = fisherYatesShuffle(potTeams, seed ? `${seed}-pot${potNumber}` : undefined);
    
    // Distribuir 1 time de cada pote para cada grupo
    for (let i = 0; i < groupCount && i < shuffled.length; i++) {
      groups[i]!.teams.push(shuffled[i]!);
    }
  }
  
  const revealOrder = generateRevealOrder(groups);
  
  return {
    groups,
    revealOrder,
    metadata: {
      algorithm: 'POT_BASED',
      timestamp: new Date().toISOString(),
      seed,
    },
  };
}

/**
 * Distribuição em Serpentina (Snake Draft)
 * 1-8, 16-9, 17-24, 32-25 (usado em alguns formatos competitivos)
 */
export function snakeDistribution(config: DrawConfig): DrawResult {
  const { teams, groupCount, seed } = config;
  
  const shuffled = fisherYatesShuffle(teams, seed);
  const groups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
    index: i,
    name: `Grupo ${String.fromCharCode(65 + i)}`,
    teams: [],
  }));
  
  let currentGroup = 0;
  let direction = 1; // 1 = forward, -1 = backward
  
  shuffled.forEach(team => {
    groups[currentGroup]!.teams.push(team);
    
    if (direction === 1 && currentGroup === groupCount - 1) {
      direction = -1;
    } else if (direction === -1 && currentGroup === 0) {
      direction = 1;
    } else {
      currentGroup += direction;
    }
  });
  
  const revealOrder = generateRevealOrder(groups);
  
  return {
    groups,
    revealOrder,
    metadata: {
      algorithm: 'SNAKE',
      timestamp: new Date().toISOString(),
      seed,
    },
  };
}

/**
 * Gerar ordem de revelação
 * Define em que ordem os times serão revelados na interface
 */
function generateRevealOrder(groups: Group[]): RevealOrder[] {
  const order: RevealOrder[] = [];
  let revealCount = 1;
  
  // Revelar por posição: primeiro todos os times da posição 1, depois posição 2, etc
  const maxPosition = Math.max(...groups.map(g => g.teams.length));
  
  for (let position = 0; position < maxPosition; position++) {
    for (const group of groups) {
      const team = group.teams[position];
      if (team) {
        order.push({
          teamId: team.id,
          groupIndex: group.index,
          position: position + 1,
          revealOrder: revealCount++,
        });
      }
    }
  }
  
  return order;
}

/**
 * Executar sorteio com base no método configurado
 */
export function executeDraw(config: DrawConfig): DrawResult {
  switch (config.method) {
    case 'RANDOM':
      return randomDistribution(config);
    case 'BALANCED':
      return balancedDistribution(config);
    case 'POT_BASED':
      return potBasedDistribution(config);
    case 'SNAKE':
      return snakeDistribution(config);
    default:
      throw new Error(`Método de sorteio não suportado: ${config.method}`);
  }
}

/**
 * Commit-Reveal Protocol
 * Gera hash de compromisso antes do sorteio
 */
export function generateCommitment(config: Omit<DrawConfig, 'seed'>): {
  commitHash: string;
  secret: string;
  commitData: object;
} {
  // Gerar segredo aleatório de alta entropia
  const secret = crypto.randomBytes(32).toString('hex');
  
  // Dados canonicalizados
  const commitData = {
    teams: config.teams.map(t => ({ id: t.id, name: t.name, pot: t.pot })).sort((a, b) => a.id.localeCompare(b.id)),
    groupCount: config.groupCount,
    teamsPerGroup: config.teamsPerGroup,
    method: config.method,
    timestamp: new Date().toISOString(),
  };
  
  // Hash = SHA-256(secret + "|" + JSON.stringify(commitData))
  const dataString = JSON.stringify(commitData);
  const commitHash = crypto
    .createHash('sha256')
    .update(`${secret}|${dataString}`)
    .digest('hex');
  
  return { commitHash, secret, commitData };
}

/**
 * Verificar compromisso criptográfico
 */
export function verifyCommitment(
  commitHash: string,
  secret: string,
  commitData: object
): boolean {
  const dataString = JSON.stringify(commitData);
  const calculatedHash = crypto
    .createHash('sha256')
    .update(`${secret}|${dataString}`)
    .digest('hex');
  
  return calculatedHash === commitHash;
}

/**
 * Validar configuração de sorteio
 */
export function validateDrawConfig(config: DrawConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (config.teams.length === 0) {
    errors.push('É necessário pelo menos 1 time');
  }
  
  if (config.groupCount < 1) {
    errors.push('É necessário pelo menos 1 grupo');
  }
  
  if (config.teams.length < config.groupCount) {
    errors.push('Número de times menor que número de grupos');
  }
  
  if (config.method === 'POT_BASED') {
    const pots: Map<number, number> = new Map();
    config.teams.forEach(team => {
      const pot = team.pot ?? 1;
      pots.set(pot, (pots.get(pot) ?? 0) + 1);
    });
    
    for (const [potNumber, count] of pots.entries()) {
      if (count < config.groupCount) {
        errors.push(`Pote ${potNumber} tem apenas ${count} times, mas precisa de ${config.groupCount}`);
      }
    }
  }
  
  // Verificar duplicações
  const teamIds = new Set<string>();
  config.teams.forEach(team => {
    if (teamIds.has(team.id)) {
      errors.push(`Time duplicado: ${team.name} (${team.id})`);
    }
    teamIds.add(team.id);
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
