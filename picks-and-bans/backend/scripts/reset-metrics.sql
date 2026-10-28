-- Script para zerar métricas e logs do Super Admin
-- Mantém apenas os admins cadastrados

-- 1. Deletar todas as sessões (SessionAction será deletada em cascata)
DELETE FROM "SessionAction";
DELETE FROM "Session";

-- 2. Deletar todos os logs de atividade
DELETE FROM "ActivityLog";

-- 3. Deletar tokens revogados (limpa blacklist)
DELETE FROM "RevokedToken";

-- Verificar o que restou:
SELECT 'Admins cadastrados:' as tabela, COUNT(*) as total FROM "Admin"
UNION ALL
SELECT 'Sessões restantes:', COUNT(*) FROM "Session"
UNION ALL
SELECT 'Logs de atividade:', COUNT(*) FROM "ActivityLog"
UNION ALL
SELECT 'Tokens revogados:', COUNT(*) FROM "RevokedToken";
