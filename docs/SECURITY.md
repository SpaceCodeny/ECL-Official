# Segurança — Elite Champions League

## Implementado

### Autenticação e sessão
- Senhas hasheadas com **argon2id** (never plain text).
- **JWT** access token curto (15m) + refresh token longo (7d), refresh hasheado (SHA-256) e armazenado em `UserSession`.
- Rotação de refresh token: cada refresh revoga o token anterior.
- Revogação de sessão individual e em massa (logout, reset de senha, suspensão de conta).
- Recuperação de senha com tokens de uso único e expiração (1h).
- Mensagens de erro de login sempre idênticas para evitar enumeração de contas.

### Autorização
- `JwtAuthGuard` global — todas as rotas exigem token exceto as marcadas `@Public()`.
- `RolesGuard` — verificação de papel por rota via `@Roles()`.
- Verificação de posse de recurso (ex.: capitão da equipe, autor da inscrição) no service.
- Impede auto-rebaixamento/suspensão de admins.
- Permissões verificadas no servidor; esconder botões no frontend não é controle de segurança.

### Validação
- Zod global (`ZodValidationPipe`) — DTOs com schema estático validados automaticamente.
- class-validator/whitelist disponível como camada adicional.

### Proteção contra abusos
- `@nestjs/throttler` global — rate limiting configurável.
- CORS restritivo — apenas origens em `CORS_ORIGINS`.

### Banco de dados
- Prisma ORM — proteção contra SQL injection via queries parametrizadas.
- Transações para operações competitivas (inscrição com verificação de vagas, registro de resultado + standings).
- Exclusão lógica (`deletedAt`) para entidades importantes.

### WebSocket
- Verificação de JWT no `handleConnection` — conexões sem token válido são desconectadas.
- Verificação de status do usuário no banco (apenas ACTIVE).
- Canais com escopo por recurso (match, tournament, user).

### Erros e logs
- `AllExceptionsFilter` — erros padronizados, stack traces omitidos em produção.
- Logs de auditoria sem senhas/tokens (apenas before/after de dados de domínio).

### Frontend
- Tokens em `sessionStorage` (nunca `localStorage`).
- `proxy.ts` — proteção de rotas client-side (complementar à segurança do servidor).
- Nenhuma variável `NEXT_PUBLIC_*` expõe segredos.

## A configurar antes de produção

- [ ] Gerar segredos JWT com `openssl rand -base64 64`.
- [ ] Configurar `MAIL_PROVIDER=smtp` com provedor real (o envio é explicitamente desativado com `none`).
- [ ] Cookies `Secure=true`, `SameSite=Lax/Strict`, `HttpOnly=true` ao migrar autenticação para cookies.
- [ ] HTTPS + headers de segurança (`Strict-Transport-Security`, `Content-Security-Policy`).
- [ ] Ajustar rate limiting ao tráfego esperado.
- [ ] Configurar backup do PostgreSQL gerenciado.
- [ ] Configurar uploads com validação de tipo/tamanho (interface desacoplada pronta).

## LGPD
- Exclusão lógica preserva dados para retenção configurável.
- `AuditLog` não armazena senhas ou tokens.
- Variáveis de ambiente para dados sensíveis (nunca no repositório).
- Política de privacidade e termos acessíveis no rodapé.
