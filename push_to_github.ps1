# Script de automatización para subir el proyecto a GitHub
Write-Host "Inicializando repositorio Git local..." -ForegroundColor Cyan
git init

# Crear archivo .gitignore para evitar subir el archivo .env (con tu clave de Gmail) y la carpeta node_modules
if (-not (Test-Path .gitignore)) {
    @"
node_modules/
.env
.DS_Store
"@ | Out-File -Encoding utf8 .gitignore
    Write-Host "Archivo .gitignore creado." -ForegroundColor Green
}

git add .
git commit -m "Initial commit: Shipping Tracker"

Write-Host "Configurando rama principal a 'main'..." -ForegroundColor Cyan
git branch -M main

$repoUrl = "https://github.com/Claudio.Abril/shipping-tracker.git"
Write-Host "Configurando repositorio remoto en: $repoUrl" -ForegroundColor Cyan

# Eliminar el origin si ya existía para evitar conflictos
git remote remove origin 2>$null
git remote add origin $repoUrl

Write-Host "Subiendo código a GitHub..." -ForegroundColor Yellow
Write-Host "Nota: Se abrirá una ventana de inicio de sesión de GitHub en tu navegador si no has iniciado sesión antes en Git." -ForegroundColor Gray
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n¡Código subido exitosamente a GitHub!" -ForegroundColor Green
    Write-Host "Ahora puedes ir a https://github.com/Claudio.Abril/shipping-tracker/settings/secrets/actions para configurar tus Secretos." -ForegroundColor Green
} else {
    Write-Host "`nHubo un problema al subir a GitHub. Asegúrate de haber creado el repositorio vacío llamado 'shipping-tracker' en tu cuenta de GitHub (Claudio.Abril)." -ForegroundColor Red
}
