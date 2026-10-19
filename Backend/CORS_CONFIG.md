# Configuração de CORS para Produção

## ⚠️ Problema: "Failed to fetch"

Se o frontend retorna `Failed to fetch` ao tentar se conectar com a API, o problema é CORS (Cross-Origin Resource Sharing).

## 🔧 Solução

### 1. Adicionar domínio do frontend no CORS

Na **Vercel Dashboard** do **Backend**:

1. Vá em **Settings** > **Environment Variables**
2. Encontre a variável `CORS_ORIGINS`
3. **Edite** e adicione o domínio do frontend:

```
CORS_ORIGINS=https://seu-frontend.vercel.app,https://ecl-backend-six.vercel.app
```

### 2. Redeploy

Após adicionar a variável:
1. Vá em **Deployments**
2. Clique nos **3 pontos** do último deploy
3. Clique em **Redeploy**

## 📋 Exemplo completo

Se seu frontend estiver em `https://ecl-frontend.vercel.app`:

```env
CORS_ORIGINS=https://ecl-frontend.vercel.app,https://ecl-backend-six.vercel.app
```

Para múltiplos domínios (staging + prod):

```env
CORS_ORIGINS=https://ecl-frontend.vercel.app,https://ecl-frontend-staging.vercel.app,http://localhost:3000
```

## ✅ Verificar se funcionou

Após o redeploy, teste no console do navegador:

```javascript
fetch('https://ecl-backend-six.vercel.app/health')
  .then(r => r.json())
  .then(console.log)
```

Se retornar o JSON sem erro, CORS está configurado! 🎉

## 🔍 Troubleshooting

### Erro persiste após redeploy

- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique se não tem espaços extras na variável CORS_ORIGINS
- Confirme que a variável está marcada para "Production"

### Funciona em localhost mas não em produção

- Certifique-se de adicionar o domínio **HTTPS** (não HTTP)
- Não use `*` (wildcard) em produção - é inseguro

### Headers CORS ainda aparecem no console

Isso é normal - são avisos informativos. O importante é que a requisição complete com sucesso.
