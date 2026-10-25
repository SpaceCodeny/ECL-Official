# Script de Verificação Pré-Deploy - Elite Champions League
# Execute este script antes de fazer deploy para produção

Write-Host "`n🔍 ECL - Verificação Pré-Deploy`n" -ForegroundColor Cyan

$errors = 0
$warnings = 0

# 1. Verificar se estamos na branch main
Write-Host "1. Verificando branch atual..." -ForegroundColor Yellow
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
    Write-Host "   ⚠️  ATENÇÃO: Você não está na branch 'main' (atual: $branch)" -ForegroundColor Yellow
    $warnings++
} else {
    Write-Host "   ✅ Branch: main" -ForegroundColor Green
}

# 2. Verificar se há mudanças não commitadas
Write-Host "`n2. Verificando mudanças não commitadas..." -ForegroundColor Yellow
$status = git status --porcelain
if ($status) {
    Write-Host "   ❌ Existem mudanças não commitadas!" -ForegroundColor Red
    Write-Host "   Execute: git add . && git commit -m 'mensagem'" -ForegroundColor Yellow
    $errors++
} else {
    Write-Host "   ✅ Nenhuma mudança pendente" -ForegroundColor Green
}

# 3. Verificar build do Backend
Write-Host "`n3. Testando build do Backend..." -ForegroundColor Yellow
Set-Location Backend
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Build do Backend falhou!" -ForegroundColor Red
    $errors++
} else {
    Write-Host "   ✅ Build do Backend OK" -ForegroundColor Green
}
Set-Location ..

# 4. Verificar build do Frontend
Write-Host "`n4. Testando build do Frontend..." -ForegroundColor Yellow
Set-Location Frontend
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Build do Frontend falhou!" -ForegroundColor Red
    $errors++
} else {
    Write-Host "   ✅ Build do Frontend OK" -ForegroundColor Green
}
Set-Location ..

# 5. Verificar arquivo .env.production do Backend
Write-Host "`n5. Verificando .env.production do Backend..." -ForegroundColor Yellow
if (Test-Path "Backend/.env.production") {
    Write-Host "   ✅ .env.production existe" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .env.production não encontrado (use .env.production.example)" -ForegroundColor Yellow
    $warnings++
}

# 6. Verificar migrations do Prisma
Write-Host "`n6. Verificando migrations do Prisma..." -ForegroundColor Yellow
$migrations = Get-ChildItem -Path "Backend/prisma/migrations" -Directory
if ($migrations.Count -gt 0) {
    Write-Host "   ✅ $($migrations.Count) migrations encontradas" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Nenhuma migration encontrada" -ForegroundColor Yellow
    $warnings++
}

# 7. Verificar se há commits não sincronizados
Write-Host "`n7. Verificando commits não sincronizados..." -ForegroundColor Yellow
git fetch origin 2>&1 | Out-Null
$behind = git rev-list HEAD..origin/main --count
$ahead = git rev-list origin/main..HEAD --count

if ($ahead -gt 0) {
    Write-Host "   ⚠️  Você tem $ahead commit(s) local(is) não enviado(s)" -ForegroundColor Yellow
    Write-Host "   Execute: git push origin main" -ForegroundColor Yellow
    $warnings++
} else {
    Write-Host "   ✅ Sincronizado com origin/main" -ForegroundColor Green
}

# 8. Verificar dependências de segurança
Write-Host "`n8. Verificando vulnerabilidades no Backend..." -ForegroundColor Yellow
Set-Location Backend
$auditResult = npm audit --production --audit-level=high 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  Vulnerabilidades encontradas" -ForegroundColor Yellow
    $warnings++
} else {
    Write-Host "   ✅ Nenhuma vulnerabilidade crítica" -ForegroundColor Green
}
Set-Location ..

Write-Host "`n9. Verificando vulnerabilidades no Frontend..." -ForegroundColor Yellow
Set-Location Frontend
$auditResult = npm audit --production --audit-level=high 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  Vulnerabilidades encontradas" -ForegroundColor Yellow
    $warnings++
} else {
    Write-Host "   ✅ Nenhuma vulnerabilidade crítica" -ForegroundColor Green
}
Set-Location ..

# Resumo final
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "📊 RESUMO DA VERIFICAÇÃO" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "`n✅ TUDO PRONTO PARA DEPLOY!" -ForegroundColor Green
    Write-Host "`nPróximos passos:" -ForegroundColor Yellow
    Write-Host "1. git push origin main" -ForegroundColor White
    Write-Host "2. Acessar dashboard da Vercel" -ForegroundColor White
    Write-Host "3. Verificar logs de deploy" -ForegroundColor White
    Write-Host "4. Testar endpoints em produção`n" -ForegroundColor White
} elseif ($errors -eq 0) {
    Write-Host "`n⚠️  $warnings AVISO(S) ENCONTRADO(S)" -ForegroundColor Yellow
    Write-Host "Você pode fazer deploy, mas revise os avisos acima.`n" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ $errors ERRO(S) ENCONTRADO(S)" -ForegroundColor Red
    Write-Host "⚠️  $warnings AVISO(S) ENCONTRADO(S)" -ForegroundColor Yellow
    Write-Host "`nCorreja os erros antes de fazer deploy!`n" -ForegroundColor Red
    exit 1
}
