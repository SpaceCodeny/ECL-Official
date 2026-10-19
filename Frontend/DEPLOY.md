# Deploy do Frontend na Vercel

## 📋 Pré-requisitos

- Conta na Vercel
- Repositório GitHub conectado
- Backend já deployado

## 🚀 Deploy Automático via GitHub

### 1. Conectar Repositório

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"**
3. Selecione o repositório `ECL-Official`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `Frontend`
   - **Build Command**: `npm run build` (padrão)
   - **Output Directory**: `.next` (padrão)
   - **Install Command**: `npm install` (padrão)

### 2. Configurar Variáveis de Ambiente

Na aba **Environment Variables**, adicione:

```bash
# URL da API Backend (pública)
NEXT_PUBLIC_API_URL=https://ecl-backend-six.vercel.app/api/v1

# URL do WebSocket (pública)
NEXT_PUBLIC_WS_URL=https://ecl-backend-six.vercel.app

# Ambiente
NEXT_PUBLIC_ENV=production
```

### 3. Deploy

Clique em **"Deploy"** e aguarde o build finalizar.

## 🔄 Deploys Automáticos

Após o setup inicial:

- **Push para `main`**: Deploy automático em produção
- **Pull Requests**: Preview deploy automático
- **Branches**: Preview deploy para cada branch

## 🌍 Domínio Personalizado (Opcional)

1. Vá em **Settings > Domains**
2. Adicione seu domínio customizado
3. Configure DNS conforme instruções da Vercel

## 📊 Monitoramento

- **Analytics**: Dashboard da Vercel mostra métricas de uso
- **Logs**: Acesse em **Deployments > [seu deploy] > Function Logs**
- **Builds**: Histórico completo de builds e deploys

## 🔧 Troubleshooting

### Build falha

- Verifique os logs de build
- Confirme que todas as dependências estão no `package.json`
- Execute `npm run build` localmente para testar

### Variáveis de ambiente não funcionam

- Variáveis públicas do Next.js **devem** começar com `NEXT_PUBLIC_`
- Após adicionar/alterar variáveis, faça redeploy
- Variáveis são aplicadas apenas no momento do build

### Imagens não carregam

- Verifique `next.config.ts` > `images.remotePatterns`
- Confirme que o backend está acessível
- Teste URLs de imagem diretamente no navegador

## 📝 Notas Importantes

- Next.js na Vercel usa Edge Functions e Serverless Functions automaticamente
- Builds são incrementais (mais rápidos após o primeiro)
- A Vercel faz cache agressivo — use `Cache-Control` headers se necessário
- Região padrão: `gru1` (São Paulo, Brasil)
