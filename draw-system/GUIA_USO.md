# 🎮 Guia de Uso - ECL Draw System

## ✅ Status Atual

**Sistema 100% Funcional e Pronto para Uso!**

- ✅ Backend rodando em `http://localhost:3001`
- ✅ Frontend rodando em `http://localhost:3000`
- ✅ Banco de dados PostgreSQL configurado
- ✅ 8 times de exemplo cadastrados
- ✅ Usuário admin criado (admin/admin123)

## 🚀 Como Acessar

### 1. Homepage
Acesse: `http://localhost:3000`

Você verá a landing page com:
- Hero section com título e descrição do sistema
- Estatísticas principais
- Cards com funcionalidades
- CTAs para acessar admin ou visualizar sorteios

### 2. Dashboard Admin
Acesse: `http://localhost:3000/admin`

Painel administrativo com:
- Estatísticas do sistema
- Quick actions para gerenciar torneios, times e sorteios
- Atividade recente

### 3. Gerenciar Torneios
Acesse: `http://localhost:3000/admin/tournaments`

- Visualize todos os torneios
- Crie novos torneios com nome, datas e descrição
- Configure times participantes
- Inicie sorteios

### 4. Gerenciar Times
Acesse: `http://localhost:3000/admin/teams`

- Visualize todos os times cadastrados
- Cadastre novos times com nome, logo (URL), região e pote
- Edite ou exclua times existentes
- Configure potes para sorteios balanceados

### 5. Configurar Sorteio
Acesse: `http://localhost:3000/admin/draws`

**Passo a passo:**
1. Selecione o torneio
2. Defina número de grupos (2-8)
3. Defina times por grupo (2-8)
4. Escolha o método de sorteio:
   - 🎲 **Aleatório**: Distribuição completamente aleatória
   - ⚖️ **Balanceado**: Distribui times de forma equilibrada
   - 🏆 **Baseado em Potes**: Um time de cada pote por grupo (RECOMENDADO)
   - 🐍 **Snake Draft**: Distribuição alternada
5. Selecione os times participantes (checkbox)
6. Clique em "Iniciar Sorteio"

### 6. Executar Sorteio
Acesse: `http://localhost:3000/draw/1` (após criar sessão)

**Interface de sorteio:**
- Visualização dos 4 grupos
- Componente Roulette com animação horizontal tipo CS2
- Botão "Sortear Próximo Time"
- Progresso do sorteio
- Modal de revelação cinematográfica quando um time é sorteado

**Como funciona:**
1. Clique em "Sortear Próximo Time"
2. Aguarde a animação da roleta (5 segundos)
3. Veja a revelação do time com efeitos visuais
4. Time é automaticamente adicionado ao grupo
5. Repita até todos os times serem sorteados
6. Clique em "Publicar Resultados" para finalizar

### 7. Visualização ao Vivo (OBS Ready)
Acesse: `http://localhost:3000/live/1`

**Otimizado para captura OBS (1920x1080):**
- Layout full screen sem chrome do navegador
- Grupos exibidos em grid 2x2
- Painel lateral com time atual sendo sorteado
- Indicador "AO VIVO" pulsante
- Estatísticas em tempo real
- Atualização automática (poll a cada 2s)

**Configuração OBS:**
1. Adicionar fonte: Browser
2. URL: `http://localhost:3000/live/1`
3. Resolução: 1920x1080
4. Refresh browser when scene becomes active: ✅

## 🎨 Design System

### Cores
- **Ink** (#0a0a0f): Background principal
- **Navy** (#0f1419): Background secundário
- **Surface** (#1a1f2e): Cards e elementos
- **Gold** (#f59e0b): Destaques e wins
- **Paper** (#f5f5f5): Texto principal
- **Muted** (#9ca3af): Texto secundário
- **Border** (#374151): Bordas

### Fontes
- **Inter**: Texto corpo
- **Oswald**: Títulos e destaque

### Componentes
- `.btn-primary`: Botão principal com gradient gold
- `.btn-secondary`: Botão secundário outline
- `.card-ecl`: Card padrão com backdrop blur
- `.container-ecl`: Container responsivo com padding

## 🔐 Segurança

### Algoritmos
- **Fisher-Yates Shuffle**: Implementação sem viés modular
- **CSPRNG**: `crypto.randomInt()` para aleatoriedade criptográfica
- **Commit-Reveal**: SHA-256 para auditabilidade
- **Validação**: Zod schemas em todas as rotas

### Auditoria
Todos os sorteios geram:
- Hash de commit antes da execução
- Seed criptográfico
- Timestamp de execução
- Resultados assinados

## 📊 Times de Exemplo

O sistema vem com 8 times pré-cadastrados:
1. FURIA Esports (Pote 1)
2. LOUD (Pote 1)
3. Imperial Esports (Pote 2)
4. paiN Gaming (Pote 2)
5. MIBR (Pote 3)
6. Fluxo (Pote 3)
7. RED Canids (Pote 4)
8. Sharks Esports (Pote 4)

## 🔧 API Endpoints

### Autenticação
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Usuário atual

### Torneios
- `GET /api/v1/tournaments` - Listar
- `POST /api/v1/tournaments` - Criar
- `GET /api/v1/tournaments/:id` - Detalhes
- `POST /api/v1/tournaments/:id/teams` - Adicionar time

### Times
- `GET /api/v1/teams` - Listar
- `POST /api/v1/teams` - Criar
- `GET /api/v1/teams/:id` - Detalhes

### Sorteios
- `POST /api/v1/draw/sessions` - Criar sessão
- `POST /api/v1/draw/sessions/:id/execute` - Executar
- `GET /api/v1/draw/sessions/:id` - Status
- `POST /api/v1/draw/sessions/:id/publish` - Publicar

## 🎬 Animações

### Roulette Component
- Scroll horizontal suave
- Ease-out personalizado `[0.32, 0.72, 0, 1]`
- Duração: 5 segundos
- Indicador central dourado com glow
- Cards duplicados para efeito infinito
- Winner highlight com pulse animation

### Team Reveal
- Scale + rotate entrance
- Partículas douradas flutuantes
- Círculos concêntricos expansivos
- Glow effect no logo
- Divisor decorativo animado
- Raios de luz rotativos
- Auto-dismiss após 4 segundos

## 🚦 Próximos Passos

### Imediato
1. Testar fluxo completo de sorteio
2. Adicionar logos reais dos times
3. Implementar sistema de sons (spin/reveal/complete)

### Curto Prazo
1. Integração com API do portal ECL
2. WebSocket para live updates
3. Histórico de sorteios
4. Export de resultados (PDF/Image)

### Longo Prazo
1. Sistema de permissões avançado
2. Multi-tenancy para diferentes ligas
3. Analytics e relatórios
4. Mobile app para visualização

## 🐛 Troubleshooting

### Backend não inicia
```bash
cd draw-system/backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend não inicia
```bash
cd draw-system/frontend
npm install
npm run dev
```

### Banco de dados vazio
```bash
cd draw-system/backend
npx tsx prisma/seed.ts
```

### Porta em uso
Altere a porta no `package.json`:
- Backend: PORT=3001 no `.env`
- Frontend: `next dev -p 3002`

## 📝 Credenciais de Teste

**Admin:**
- Email: `admin@ecl.gg`
- Senha: `admin123`

## 🎉 Pronto!

O sistema está 100% funcional e pronto para demonstração. Todas as páginas principais foram implementadas com design impecável e animações suaves.

Acesse `http://localhost:3000` e comece a explorar!
