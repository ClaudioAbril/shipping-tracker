# Script interactivo de automatización para subir el proyecto a GitHub

# 1. Solicitar o confirmar el nombre de usuario de GitHub
$defaultUser = "ClaudioAbril"
Write-Host "Configuración de GitHub" -ForegroundColor Cyan
Write-Host "Ingresa tu nombre de usuario de GitHub (handle de la URL, ej: claudio-abril)."
$user = Read-Host "Presiona Enter para usar el valor predeterminado [$defaultUser]"
if ([string]::IsNullOrWhiteSpace($user)) {
    $user = $defaultUser
}

# Limpiar posibles espacios o puntos al inicio/final
$user = $user.Trim()

# 2. Inicializar el repositorio Git
Write-Host "`nInicializando repositorio Git local..." -ForegroundColor Cyan
git init

# Crear archivo .gitignore
if (-not (Test-Path .gitignore)) {
    @"
node_modules/
.env
.DS_Store
"@ | Out-File -Encoding utf8 .gitignore
    Write-Host "Archivo .gitignore creado." -ForegroundColor Green
}

git add .
git commit -m "Initial commit: Shipping Tracker" 2>$null

Write-Host "Configurando rama principal a 'main'..." -ForegroundColor Cyan
git branch -M main

# 3. Definir y configurar el repositorio remoto
$repoUrl = "https://github.com/$user/shipping-tracker.git"
Write-Host "`nConfigurando repositorio remoto en: $repoUrl" -ForegroundColor Cyan

# Eliminar origen si existía previamente
git remote remove origin 2>$null
git remote add origin $repoUrl

# 4. Explicar los requisitos antes de subir
Write-Host "`n[IMPORTANTE] Requisitos previos:" -ForegroundColor Yellow
Write-Host "1. Debes haber creado el repositorio vacío llamado 'shipping-tracker' en tu cuenta de GitHub."
Write-Host "   Puedes crearlo desde: https://github.com/new"
Write-Host "2. El repositorio debe estar vacío (sin README, sin .gitignore y sin licencia)."
Write-Host "3. Asegúrate de que el nombre de usuario '$user' es el que figura en la URL de tu perfil de GitHub.`n"

$confirm = Read-Host "¿Has verificado los puntos anteriores y deseas continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s" -and $confirm -ne "si" -and $confirm -ne "sí") {
    Write-Host "Operación cancelada por el usuario. Crea el repositorio en GitHub y vuelve a ejecutar el script." -ForegroundColor Yellow
    Exit
}

# 5. Intentar subir el código
Write-Host "`nSubiendo código a GitHub..." -ForegroundColor Yellow
Write-Host "Nota: Si Git te lo solicita, inicia sesión en la ventana del navegador que se abrirá." -ForegroundColor Gray
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n¡Código subido exitosamente a GitHub!" -ForegroundColor Green
    Write-Host "Ahora puedes configurar tus Secretos en: https://github.com/$user/shipping-tracker/settings/secrets/actions" -ForegroundColor Green
} else {
    Write-Host "`nError al subir el código a GitHub." -ForegroundColor Red
    Write-Host "Causas comunes:" -ForegroundColor Gray
    Write-Host " - El repositorio 'shipping-tracker' no ha sido creado en GitHub bajo la cuenta '$user'." -ForegroundColor Gray
    Write-Host " - El nombre de usuario '$user' no es correcto (verifica tu nombre en la URL de tu perfil de GitHub)." -ForegroundColor Gray
    Write-Host " - Problemas de autenticación con tus credenciales de GitHub." -ForegroundColor Gray
}
