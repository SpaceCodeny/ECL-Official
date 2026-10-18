# Deploy — Elite Champions League

## Visão geral

| Componente | Destino recomendado |
| --- | --- |
| Frontend | Plataforma compatível com Next.js (Node.js runtime) — não serverless convencional sem adaptação |
| Backend | Hospedagem de aplicação Node.js (contêiner ou VM) — mantém WebSockets e estado de conexão |
| Banco | PostgreSQL 16 gerenciado (RDS, Cloud SQL, Neon, etc.) |

> O backend NestJS usa WebSockets (Socket.IO). Evite hospedar como função serverless sem adaptar o transporte; prefira contêiner/VM com processo persistente.

## Variáveis de produção

- Gere segredos JWT com `openssl rand -base64 64`.
- `NODE_ENV=production`.
- `CORS_ORIGINS` com os domínios oficiais (sem localhost).
- `DATABASE_URL` apontando para o PostgreSQL gerenciado.
- Cookies: `Secure=true`, `SameSite=Lax`/`Strict`, `HttpOnly=true`.
- E-mail: configurar `MAIL_PROVIDER=smtp` com credenciais reais (não `none`).

## Estratégia de migração

1. Gere a migração em desenvolvimento: `npx prisma migrate dev --name <nome>`.
2. Em produção, aplique: `npx prisma migrate deploy` (não `db push`).
3. Pré-deploy: rode `npx prisma generate` para garantir o client.

## Backup e recuperação

- Use `pg_dump` do PostgreSQL gerenciado ou snapshots automáticos do provedor.
- Rotina recomendada: backup diário + retenção conforme política.
- Teste restore em ambiente isolado periodicamente.

## Domínio e HTTPS

- Frontend e backend atrás de um reverse proxy (Nginx/Caddy/ALB) com TLS.
- Redirecione HTTP → HTTPS.
- Configure headers: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`.
- WebSocket: habilitar upgrade no proxy para Socket.IO.

## Bootstrap do primeiro administrador

Em produção, **não** use o seed com credenciais fixas. Crie o primeiro admin via:
- Variável de ambiente de bootstrap de uso único, ou
- CLI protegida executada uma vez no ambiente.

O mecanismo é acoplado e documentado no módulo de auth (Fase 3).

## Checklist pré-produção

- [ ] `NODE_ENV=production`
- [ ] Segredos JWT rotacionados (não defaults)
- [ ] CORS restritivo
- [ ] HTTPS + headers de segurança
- [ ] Migrações aplicadas (`migrate deploy`)
- [ ] PostgreSQL gerenciado com backup configurado
- [ ] Provedor de e-mail real configurado
- [ ] Logs sem informações sensíveis
- [ ] Rate limiting ajustado ao tráfego esperado
