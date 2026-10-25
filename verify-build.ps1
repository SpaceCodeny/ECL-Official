# Script de Verificacao de Build - ECL
Write-Host "`n>>> ECL - Verificacao de Build`n" -ForegroundColor Cyan

$errors = 0

# 1. Build do Backend
Write-Host "1. Testando build do Backend..." -ForegroundColor Yellow
Set-Location Backend
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   [X] Build do Backend FALHOU!" -ForegroundColor Red
    $errors++
} else {
    Write-Host "   [OK] Build do Backend" -ForegroundColor Green
}
Set-Location ..

# 2. Build do Frontend
Write-Host "`n2. Testando build do Frontend..." -ForegroundColor Yellow
Set-Location Frontend
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   [X] Build do Frontend FALHOU!" -ForegroundColor Red
    $errors++
} else {
    Write-Host "   [OK] Build do Frontend" -ForegroundColor Green
}
Set-Location ..

# Resumo
Write-Host "`n========================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "[OK] TODOS OS BUILDS PASSARAM!" -ForegroundColor Green
    Write-Host "`nSeguro para fazer push e deploy!`n" -ForegroundColor Green
} else {
    Write-Host "[X] $errors ERRO(S) ENCONTRADO(S)" -ForegroundColor Red
    Write-Host "`nNAO FACA PUSH ate corrigir os erros!`n" -ForegroundColor Red
    exit 1
}
