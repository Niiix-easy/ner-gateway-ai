$ErrorActionPreference = "Stop"

Set-Location (Split-Path $PSScriptRoot -Parent)

New-Item -ItemType Directory -Force -Path ".docker" | Out-Null

$envFile = ".docker\\stack.env"

function New-RandomDbUser {
    $userSuffix = -join (((48..57) + (97..122) | Get-Random -Count 8) | ForEach-Object { [char]$_ })
    "platform_$userSuffix"
}

function New-RandomSecret([int]$len = 32) {
    -join (((48..57) + (65..90) + (97..122) | Get-Random -Count $len) | ForEach-Object { [char]$_ })
}

function Write-EnvFile([string]$path, [hashtable]$vars) {
    $existing = @{}
    if (Test-Path $path) {
        Get-Content $path | ForEach-Object {
            if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') {
                $existing[$matches[1]] = $matches[2]
            }
        }
    }
    foreach ($k in $vars.Keys) { $existing[$k] = $vars[$k] }
    $content = ($existing.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join "`n"
    Set-Content -NoNewline -Path $path -Value $content
}

if (!(Test-Path $envFile)) {
    $dbUser = New-RandomDbUser
    $dbPass = New-RandomSecret 32
    $httpPort = if ($env:PLATFORM_HTTP_PORT) { $env:PLATFORM_HTTP_PORT } else { "80" }
    $appUrl = if ($env:PLATFORM_APP_URL) { $env:PLATFORM_APP_URL } else { "http://localhost" }
    $webhookPublic = if ($env:PLATFORM_WEBHOOK_PUBLIC_URL) { $env:PLATFORM_WEBHOOK_PUBLIC_URL } else { $appUrl }
    Write-EnvFile $envFile @{
        PLATFORM_DB_CONNECTION = "pgsql"
        PLATFORM_DB_HOST = "postgres"
        PLATFORM_DB_PORT = "5432"
        PLATFORM_DB_DATABASE = "platform"
        PLATFORM_DB_USERNAME = $dbUser
        PLATFORM_DB_PASSWORD = $dbPass
        PLATFORM_APP_URL = $appUrl
        PLATFORM_WEBHOOK_PUBLIC_URL = $webhookPublic
        PLATFORM_HTTP_PORT = $httpPort
        PLATFORM_QUEUE_CONNECTION = if ($env:PLATFORM_QUEUE_CONNECTION) { $env:PLATFORM_QUEUE_CONNECTION } else { "redis" }
        PLATFORM_CACHE_STORE = if ($env:PLATFORM_CACHE_STORE) { $env:PLATFORM_CACHE_STORE } else { "redis" }
        PLATFORM_SESSION_DRIVER = if ($env:PLATFORM_SESSION_DRIVER) { $env:PLATFORM_SESSION_DRIVER } else { "file" }
        PLATFORM_REDIS_MAXMEMORY = if ($env:PLATFORM_REDIS_MAXMEMORY) { $env:PLATFORM_REDIS_MAXMEMORY } else { "128mb" }
        PLATFORM_REDIS_MAXMEMORY_POLICY = if ($env:PLATFORM_REDIS_MAXMEMORY_POLICY) { $env:PLATFORM_REDIS_MAXMEMORY_POLICY } else { "allkeys-lru" }
        PLATFORM_QUEUE_WORKER_MEMORY = if ($env:PLATFORM_QUEUE_WORKER_MEMORY) { $env:PLATFORM_QUEUE_WORKER_MEMORY } else { "128" }
        PLATFORM_QUEUE_WORKER_MAX_TIME = if ($env:PLATFORM_QUEUE_WORKER_MAX_TIME) { $env:PLATFORM_QUEUE_WORKER_MAX_TIME } else { "3600" }
        PLATFORM_QUEUE_WORKER_MAX_JOBS = if ($env:PLATFORM_QUEUE_WORKER_MAX_JOBS) { $env:PLATFORM_QUEUE_WORKER_MAX_JOBS } else { "1000" }
        PLATFORM_CADDY_HOST = if ($env:PLATFORM_CADDY_HOST) { $env:PLATFORM_CADDY_HOST } else { ":80" }
    }
} else {
    $content = Get-Content $envFile -Raw
    $needsRotate = $content -match '^\s*PLATFORM_DB_USERNAME\s*=\s*(platform)?\s*$' -or $content -match '^\s*PLATFORM_DB_PASSWORD\s*=\s*(platform)?\s*$'
    if ($needsRotate) {
        $dbUser = New-RandomDbUser
        $dbPass = New-RandomSecret 32
        Write-EnvFile $envFile @{
            PLATFORM_DB_USERNAME = $dbUser
            PLATFORM_DB_PASSWORD = $dbPass
        }
    }
    $contentMerge = Get-Content $envFile -Raw
    if ($contentMerge -notmatch '(?m)^\s*PLATFORM_DB_CONNECTION\s*=') { Write-EnvFile $envFile @{ PLATFORM_DB_CONNECTION = "pgsql" } }
    if ($contentMerge -notmatch '(?m)^\s*PLATFORM_DB_HOST\s*=') { Write-EnvFile $envFile @{ PLATFORM_DB_HOST = "postgres" } }
    if ($contentMerge -notmatch '(?m)^\s*PLATFORM_DB_PORT\s*=') { Write-EnvFile $envFile @{ PLATFORM_DB_PORT = "5432" } }
    if ($contentMerge -notmatch '(?m)^\s*PLATFORM_WEBHOOK_PUBLIC_URL\s*=') {
        $appUrlLine = Get-Content $envFile | Where-Object { $_ -match '^\s*PLATFORM_APP_URL\s*=' } | Select-Object -First 1
        $valApp = "http://localhost"
        if ($appUrlLine -match '^\s*PLATFORM_APP_URL\s*=\s*(.+)\s*$') { $valApp = $matches[1].Trim() }
        if ($env:PLATFORM_APP_URL) { $valApp = $env:PLATFORM_APP_URL }
        $wh = if ($env:PLATFORM_WEBHOOK_PUBLIC_URL) { $env:PLATFORM_WEBHOOK_PUBLIC_URL } else { $valApp }
        Write-EnvFile $envFile @{ PLATFORM_WEBHOOK_PUBLIC_URL = $wh }
    }
}

$composeFilesRaw = if ($env:PLATFORM_COMPOSE_FILES) { $env:PLATFORM_COMPOSE_FILES } else { "docker-compose.yml" }
$composeFiles = $composeFilesRaw -split ';' | Where-Object { $_ -and $_.Trim() -ne "" } | ForEach-Object { $_.Trim() }
$composeArgs = @()
foreach ($f in $composeFiles) {
    $composeArgs += @("-f", $f)
}

docker compose @composeArgs --env-file $envFile up --build -d
