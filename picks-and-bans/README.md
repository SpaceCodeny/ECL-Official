# 🎮 ECL Picks & Bans

Sistema de **Picks e Bans em tempo real** da **Elite Champions League (ECL)** para gerenciamento profissional de vetos de mapas em partidas competitivas de Valorant.

![ECL Logo](https://ecl-official.vercel.app/images/logos/logo.png)

---

## 📋 Sobre o Sistema

O **ECL Picks & Bans** é uma ferramenta standalone desenvolvida para facilitar o processo de seleção e banimento de mapas durante partidas oficiais da ECL. O sistema oferece uma experiência visual moderna, intuitiva e totalmente responsiva, permitindo que jogadores e organizadores gerenciem vetos de forma profissional e em tempo real.

### ✨ Características Principais

- **⚡ Tempo Real**: Sistema de sincronização automática via polling (2 segundos)
- **🎨 Design Premium**: Interface moderna com identidade visual ECL (navy, ink, gold)
- **📱 Totalmente Responsivo**: Otimizado para todos os dispositivos (mobile, tablet, desktop)
- **🔐 Autenticação Segura**: Painel administrativo protegido com JWT
- **🏆 Integração ECL**: Importa automaticamente times e logos do banco de dados da ECL
- **🗺️ 7 Mapas Valorant**: Breeze, Dune, Hanami, Prision, Province, Rust, Sandstone
- **📊 Regras de CT**: Atribuição automática de lado CT baseada nas escolhas
- **💬 Compartilhamento WhatsApp**: Resultados formatados para envio direto

---

## 🚀 Como Usar

### Para Administradores (Criar Sessão)

1. **Acesse o Painel Admin**: https://peaks-and-bans.vercel.app
2. **Faça Login** com as credenciais ECL
3. **Selecione os Times**:
   - Escolha times cadastrados no banco ECL (com logos)
   - OU digite manualmente os nomes dos times
4. **Clique em "Criar Sessão"**
5. **Compartilhe o Link** gerado com ambos os jogadores

### Para Jogadores (Participar da Sessão)

1. **Acesse o Link** compartilhado pelo administrador
2. **Digite seu Nickname** e selecione seu time
3. **Aguarde** o adversário entrar na sessão
4. **Execute os Vetos** na ordem indicada:
   - 🔴 **Ban Team A** → Team A bane primeiro mapa
   - 🔴 **Ban Team B** → Team B bane segundo mapa
   - 🟢 **Pick Team A** → Team A escolhe primeiro mapa *(Team B inicia CT)*
   - 🟢 **Pick Team B** → Team B escolhe segundo mapa *(Team A inicia CT)*
   - 🔴 **Ban Team B** → Team B bane terceiro mapa
   - 🔴 **Ban Team A** → Team A bane quarto mapa
   - 🟡 **Decider** → Mapa restante é o desempate *(Vencedor do Map 1 inicia CT)*

5. **Visualize os Resultados** e copie para WhatsApp se necessário

---

## 🎯 Quem Pode Usar

### ✅ **USO TOTALMENTE LIVRE**

O sistema **ECL Picks & Bans** é de **uso livre e gratuito** para:

- ✅ **Jogadores da ECL** em partidas oficiais
- ✅ **Equipes organizando scrims** (treinos)
- ✅ **Torneios comunitários** de Valorant
- ✅ **Streamers e criadores de conteúdo**
- ✅ **Qualquer pessoa** que precise gerenciar vetos de mapas

### 🔓 Acesso Aberto

**Não há restrições!** Qualquer pessoa pode:
- Criar quantas sessões quiser
- Usar para partidas casuais ou competitivas
- Compartilhar o sistema com outras comunidades
- Utilizar em eventos e campeonatos próprios

> **Nota**: O painel administrativo requer login apenas para manter a organização, mas a criação de sessões é ilimitada e livre.

---

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** + **Express**
- **JWT** para autenticação
- **bcrypt** para segurança de senhas
- **CORS** configurado para Vercel
- **Polling** para sincronização serverless

### Frontend
- **Next.js 14** (App Router)
- **TypeScript** para type safety
- **Tailwind CSS** para estilização
- **Lucide Icons** para ícones premium
- **Responsive Design** mobile-first

### Deploy
- **Vercel Serverless** (backend e frontend)
- **In-Memory Storage** (sessions Map)
- **ECL Database Integration** (Supabase + Prisma)

---

## 📐 Regras de Atribuição CT

O sistema calcula automaticamente qual time inicia no lado **Counter-Terrorist (CT)** seguindo as regras competitivas:

| Situação | Quem Inicia CT |
|----------|----------------|
| **Mapa Escolhido pelo Team A** | Team B inicia CT |
| **Mapa Escolhido pelo Team B** | Team A inicia CT |
| **Mapa Decider (7º mapa)** | Vencedor do Mapa 1 inicia CT |

---

## 🎨 Identidade Visual

O sistema segue rigorosamente a identidade visual da ECL:

- **Cores Primárias**:
  - Navy: `#0a192f`
  - Ink: `#112240`
  - Gold: `#f59e0b` / `#fbbf24`
  
- **Tipografia**:
  - Títulos: **Oswald** (bold, uppercase)
  - Corpo: **Inter** (clean, modern)

- **Backgrounds**:
  - Desktop: `desktop.png` (ECL Portal)
  - Mobile: `mobile.png` (ECL Portal)

---

## 🔗 Links Importantes

- **Sistema de Picks & Bans**: https://peaks-and-bans.vercel.app
- **Portal ECL**: https://ecl-official.vercel.app
- **API ECL**: https://ecl-backend-six.vercel.app
- **Backend Picks & Bans**: https://peaks-and-bans-backend.vercel.app

---

## 📱 Responsividade

O sistema é **totalmente responsivo** e otimizado para:

- 📱 **Mobile**: < 768px (smartphones)
- 📲 **Tablet**: 768px - 1024px (iPads, tablets)
- 💻 **Desktop**: > 1024px (notebooks, desktops, ultrawide)

### Testes Recomendados
- iPhone SE (375x667)
- iPhone 12/13/14 (390x844)
- iPad (768x1024)
- Desktop HD (1920x1080)
- Desktop 4K (3840x2160)

---

## 🔐 Autenticação

### Painel Administrativo

O painel admin é protegido por autenticação JWT:

- **Usuário**: `ECL-master`
- **Senha**: `ECL@2026`

> **Nota**: Credenciais de produção armazenadas como hash bcrypt nas variáveis de ambiente da Vercel.

---

## 📦 Deploy

### Backend (Vercel)

**Variáveis de Ambiente Necessárias:**

```env
CLIENT_URL=https://peaks-and-bans.vercel.app
ECL_API_URL=https://ecl-backend-six.vercel.app
ECL_FRONTEND_URL=https://ecl-official.vercel.app
JWT_SECRET=ecl-picks-bans-2024-secret-key-very-secure-random-string
ADMIN_USERNAME=ECL-master
ADMIN_PASSWORD_HASH=$2a$10$kVoFrVjAAt1lgk9/0bKd9.CtQcELjmn2WRrd4.Hzcz8grkmxJWVgS
```

### Frontend (Vercel)

**Variáveis de Ambiente Necessárias:**

```env
NEXT_PUBLIC_API_URL=https://peaks-and-bans-backend.vercel.app
```

### Comandos de Deploy

```bash
# Backend
cd backend
vercel --prod

# Frontend
cd frontend
vercel --prod
```

---

## 🧪 Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Backend

```bash
cd backend
npm install
npm run dev
# Rodando em http://localhost:3003
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Rodando em http://localhost:3002
```

---

## 🎯 Fluxo Completo do Sistema

```
1. Admin faz login → /login
2. Admin cria sessão → /admin
3. Admin compartilha link → /session/[id]
4. Jogador A acessa link e escolhe time
5. Jogador B acessa link e escolhe time
6. Sistema sincroniza via polling (2s)
7. Jogadores executam vetos na ordem
8. Sistema calcula CT automaticamente
9. Resultados finais exibidos
10. Opção de copiar para WhatsApp
```

---

## 🤝 Contribuição

Este é um projeto **open source** da ECL. Contribuições, sugestões e melhorias são bem-vindas!

### Como Contribuir

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é mantido pela **Elite Champions League (ECL)** e está disponível para uso livre e gratuito pela comunidade.

---

## 📞 Suporte

Para dúvidas, sugestões ou reportar problemas:

- **Discord ECL**: [Link do Discord]
- **Email**: contato@ecl.com.br
- **Portal**: https://ecl-official.vercel.app

---

## 🏆 Desenvolvido por ECL

**Elite Champions League** - A liga competitiva de Valorant mais profissional do Brasil.

*Versão 1.0.0 - 2026*

---

**🎮 Bons vetos e boa sorte nas partidas! 🏆**
