# Plano Técnico — ECL Draw System

## 1. Decisões Arquiteturais

### Separação Backend/Frontend
- **Backend**: API REST stateless em Node.js
- **Frontend**: Next.js 14 com Server Components e Client Components híbridos
- **Comunicação**: REST para operações CRUD, WebSocket para atualizações em tempo real da roleta

### Banco de Dados
- **PostgreSQL 15+**: Robustez, ACID, suporte a JSON
- **Prisma ORM**: Type-safety, migrations, client gerado
- **Conexão direta**: DIRECT_URL para migrations, DATABASE_URL para conexão pooled

### Autenticação
- **JWT**: Tokens assinados com HS256
- **Roles**: SUPER_ADMIN, ADMIN, OPERATOR
- **Session**: Stateless, refresh tokens em HTTP-only cookies

### Aleatoriedade
- **crypto.randomInt()**: Fonte CSPRNG do Node.js
- **Fisher-Yates**: Implementação sem viés de módulo
- **Commit-Reveal**: SHA-256 do segredo + dados canonicalizados

## 2. Modelo de Dados (Prisma Schema)

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  role         Role
  status       Status   @default(ACTIVE)
  createdAt    DateTime @default(now())
  tournaments  Tournament[]
  drawSessions DrawSession[]
  auditEvents  AuditEvent[]
}

model Tournament {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  game        String
  edition     String
  status      TournamentStatus
  externalId  String?  // ID no portal ECL
  createdById String
  createdBy   User     @relation(...)
  teams       TournamentTeam[]
  drawSessions DrawSession[]
  groups      TournamentGroup[]
}

model Team {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logoUrl     String?
  externalId  String?  // ID no portal ECL
  tournaments TournamentTeam[]
}

model DrawSession {
  id            String   @id @default(cuid())
  tournamentId  String
  tournament    Tournament @relation(...)
  method        DrawMethod
  groupCount    Int
  status        DrawStatus
  commitHash    String?  // SHA-256 do commit
  revealSecret  String?  // Revelado após conclusão
  results       DrawResult[]
  participants  DrawParticipant[]
  createdById   String
  createdBy     User     @relation(...)
  publishedAt   DateTime?
  canceledAt    DateTime?
}

model DrawResult {
  id        String   @id @default(uuid())
  sessionId String
  session   DrawSession @relation(...)
  teamId    String
  team      Team     @relation(...)
  groupIndex Int
  revealOrder Int
  revealedAt DateTime?
}

model TournamentGroup {
  id           String   @id @default(cuid())
  tournamentId String
  tournament   Tournament @relation(...)
  name         String   // Grupo A, B, C...
  order        Int
  members      GroupMembership[]
}

model AuditEvent {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(...)
  action    String
  resource  String
  resourceId String
  details   Json
  timestamp DateTime @default(now())
}
```

## 3. Endpoints API (v1)

### Públicos
- `GET /api/v1/health`
- `GET /api/v1/tournaments/:id/public` — Dados públicos
- `GET /api/v1/draw-sessions/:id/public` — Resultados publicados
- `GET /api/v1/tournaments/:id/groups` — Grupos finais
- `GET /api/v1/tournaments/:id/export` — JSON/CSV

### Administrativos (requer auth)
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/tournaments`
- `POST /api/v1/tournaments`
- `POST /api/v1/tournaments/:id/teams`
- `POST /api/v1/tournaments/:id/import`
- `POST /api/v1/draw-sessions`
- `POST /api/v1/draw-sessions/:id/execute` — Gera resultado
- `POST /api/v1/draw-sessions/:id/reveal-next` — Revela próximo time
- `POST /api/v1/draw-sessions/:id/publish` — Publica oficial
- `POST /api/v1/draw-sessions/:id/cancel`
- `GET /api/v1/draw-sessions/:id/audit`

## 4. Algoritmos de Sorteio

### Distribuição Aleatória Simples
```typescript
function randomDistribution(teams: Team[], groupCount: number): Group[] {
  const shuffled = fisherYatesShuffle(teams);
  const groups = Array.from({ length: groupCount }, () => []);
  shuffled.forEach((team, i) => groups[i % groupCount].push(team));
  return groups;
}
```

### Distribuição por Potes
```typescript
function potBasedDistribution(
  teams: Team[],
  pots: Pot[],
  groupCount: number
): Group[] {
  const groups = Array.from({ length: groupCount }, () => []);
  
  for (const pot of pots) {
    const shuffled = fisherYatesShuffle(pot.teams);
    shuffled.forEach((team, i) => groups[i % groupCount].push(team));
  }
  
  return groups;
}
```

### Fisher-Yates sem viés
```typescript
function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);  // [0, i] inclusive
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

### Commit-Reveal
```typescript
// 1. Commit
const secret = crypto.randomBytes(32).toString('hex');
const data = JSON.stringify({ teams, groupCount, method, timestamp });
const commitHash = crypto.createHash('sha256')
  .update(secret + '|' + data)
  .digest('hex');

// Salvar commitHash público ANTES do sorteio

// 2. Execute
const result = executeDrawWithSeed(secret, data);

// 3. Reveal
// Publicar secret e data após conclusão
// Qualquer um pode verificar: hash(secret + data) === commitHash
```

## 5. Animação da Roleta

### Estrutura de Componentes
```tsx
<DrawRoulette
  teams={teams}
  winnerIndex={resultFromServer}
  onRevealComplete={handleNext}
  audioEnabled={audioEnabled}
/>
```

### Lógica da Animação
1. **Preparação**: Criar faixa horizontal com 3+ cópias do array
2. **Início**: Velocidade alta (3000px/s)
3. **Movimento**: CSS transform translateX com ease-out
4. **Desaceleração**: Reduzir velocidade progressivamente
5. **Parada**: Posição final calculada para alinhar o vencedor no centro
6. **Revelação**: Transição para tela de destaque

```typescript
// Cálculo da posição final
const cardWidth = 200;
const centerOffset = (viewportWidth / 2) - (cardWidth / 2);
const copiesNeeded = 3;
const totalCards = teams.length * copiesNeeded;
const winnerPosition = (copiesNeeded - 1) * teams.length + winnerIndex;
const finalX = -(winnerPosition * cardWidth) + centerOffset;

// Animação
element.style.transform = `translateX(${finalX}px)`;
element.style.transition = 'transform 5s cubic-bezier(0.22, 0.61, 0.36, 1)';
```

### Sincronização de Áudio
```typescript
const sounds = {
  start: new Audio('/sounds/roulette-start.mp3'),
  spin: new Audio('/sounds/roulette-spin.mp3'),
  slowdown: new Audio('/sounds/roulette-slow.mp3'),
  stop: new Audio('/sounds/roulette-stop.mp3'),
  reveal: new Audio('/sounds/reveal.mp3'),
};

// Tocar em sequência
await sounds.start.play();
sounds.spin.loop = true;
sounds.spin.play();

// Ao desacelerar
sounds.spin.pause();
sounds.slowdown.play();

// Ao parar
sounds.stop.play();
await delay(500);
sounds.reveal.play();
```

## 6. Testes Críticos

### Unitários (Vitest)
- ✅ `fisherYatesShuffle` produz permutação uniforme
- ✅ `randomDistribution` não duplica times
- ✅ `potBasedDistribution` respeita restrições
- ✅ Commit-reveal verification

### Integração
- ✅ POST /draw-sessions/:id/execute retorna resultado válido
- ✅ Duas requisições concorrentes de execute são bloqueadas
- ✅ Cancelamento autorizado limpa estado
- ✅ Publicação bloqueia alterações

### E2E (Playwright)
- ✅ Fluxo completo: criar campeonato → cadastrar times → sortear → publicar
- ✅ Roleta para no time correto
- ✅ Áudio toca após interação do usuário
- ✅ Recarregar página durante revelação mantém estado

## 7. Segurança

### Autenticação
```typescript
// JWT com expiração curta
const token = jwt.sign(
  { userId, role },
  JWT_SECRET,
  { expiresIn: '15m', algorithm: 'HS256' }
);

// Refresh token em HTTP-only cookie
res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
});
```

### Validação
```typescript
const createTournamentSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  game: z.string().min(2),
  edition: z.string().min(4).max(10),
});
```

### Rate Limiting
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requisições
  standardHeaders: true,
  legacyHeaders: false,
});
```

## 8. Deploy

### Docker Compose
```yaml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ecl_draw
      POSTGRES_USER: draw_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  backend:
    build: ./backend
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://draw_user:${DB_PASSWORD}@db:5432/ecl_draw
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3001:3001"
  
  frontend:
    build: ./frontend
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Animação dessincronizada | Média | Alto | Resultado vem do servidor, animação é visual |
| Duplicação de times | Baixa | Crítico | Testes + constraint UNIQUE no banco |
| Aleatoriedade previsível | Baixa | Crítico | crypto.randomInt + commit-reveal |
| Upload malicioso | Média | Médio | Validação MIME real + limit de tamanho |
| Concorrência | Média | Alto | Transações + row-level locks |

## 10. Próximos Passos

1. ✅ Criar estrutura de pastas
2. ⏳ Configurar backend (package.json, Prisma, TypeScript)
3. ⏳ Implementar modelos e migrations
4. ⏳ Criar algoritmos de sorteio
5. ⏳ Implementar API REST
6. ⏳ Configurar frontend Next.js
7. ⏳ Criar componentes de roleta
8. ⏳ Integrar áudio
9. ⏳ Implementar testes
10. ⏳ Documentar API com OpenAPI

**Estimativa**: ~40-50 horas de desenvolvimento focado

**Prioridades**:
1. Núcleo funcional (sorteio + persistência)
2. API REST
3. Interface administrativa
4. Roleta e animações
5. Tela pública
6. Testes e documentação
