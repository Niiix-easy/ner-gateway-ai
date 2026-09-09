<?php

/**
 * API do instalador - test-db, install-step (evita timeout dividindo em etapas)
 */

declare(strict_types=1);

@set_time_limit(120);
@ini_set('max_execution_time', '120');
@ini_set('memory_limit', '512M');

header('Content-Type: application/json; charset=utf-8');

// Evita output acidental antes do JSON (warnings, notices)
ob_start();

$basePath = realpath(__DIR__ . '/../..') ?: dirname(__DIR__, 2);

/** Verifica se está instalado via .env (APP_INSTALLED=true). Sem .env = não instalado. */
$isAppInstalled = static function (string $base): bool {
    $envPath = $base . DIRECTORY_SEPARATOR . '.env';
    if (!is_file($envPath)) {
        return false;
    }
    $content = file_get_contents($envPath);
    return (bool) preg_match('/^\s*APP_INSTALLED\s*=\s*["\']?true["\']?\s*(?:#|$)/mi', $content);
};

if ($isAppInstalled($basePath)) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Aplicação já instalada.']);
    exit;
}

if (! filter_var(getenv('INSTALLER_ENABLED') !== false ? getenv('INSTALLER_ENABLED') : 'true', FILTER_VALIDATE_BOOLEAN)) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Instalador web desabilitado.']);
    exit;
}

$expectedInstallerToken = getenv('INSTALLER_TOKEN') ?: '';
if ($expectedInstallerToken === '' && is_file($basePath . DIRECTORY_SEPARATOR . '.install-token')) {
    $expectedInstallerToken = trim((string) file_get_contents($basePath . DIRECTORY_SEPARATOR . '.install-token'));
}
if ($expectedInstallerToken !== '') {
    $provided = $_SERVER['HTTP_X_INSTALLER_TOKEN'] ?? $_GET['installer_token'] ?? '';
    if (! is_string($provided) || ! hash_equals($expectedInstallerToken, $provided)) {
        ob_end_clean();
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Token de instalação inválido.']);
        exit;
    }
}

$input = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];
if ($expectedInstallerToken !== '' && empty($input['installer_token'])) {
    $input['installer_token'] = $_SERVER['HTTP_X_INSTALLER_TOKEN'] ?? $_GET['installer_token'] ?? '';
}
$action = $input['action'] ?? '';

/**
 * Retorna JSON e encerra. Limpa output buffer para evitar resposta vazia.
 */
$sendJson = function ($data): void {
    ob_end_clean();
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
};

// Captura erros fatais para retornar JSON em vez de resposta vazia
register_shutdown_function(function (): void {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        @ob_end_clean();
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'success' => false,
            'message' => 'Erro PHP: ' . ($err['message'] ?? 'Erro fatal'),
            'log' => ($err['file'] ?? '') . ':' . ($err['line'] ?? 0)
        ], JSON_UNESCAPED_UNICODE);
    }
});

/**
 * Valida se o SQL manual já foi importado (sem rodar migrate).
 *
 * @return array{ok:bool,message:string,missing:list<string>}
 */
function install_validate_schema(PDO $pdo): array
{
    $required = [
        'migrations',
        'users',
        'jobs',
        'failed_jobs',
        'cache',
        'orders',
        'products',
        'password_reset_tokens',
        'sessions',
    ];
    $missing = [];
    foreach ($required as $table) {
        try {
            $stmt = $pdo->query('SHOW TABLES LIKE '.$pdo->quote($table));
            if (! $stmt || ! $stmt->fetchColumn()) {
                $missing[] = $table;
            }
        } catch (Throwable) {
            $missing[] = $table;
        }
    }

    if ($missing !== []) {
        return [
            'ok' => false,
            'message' => 'Banco conectou, mas o schema ainda não foi importado. Importe o arquivo SQL (database.sql) no phpMyAdmin antes de continuar.',
            'missing' => $missing,
        ];
    }

    try {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM migrations')->fetchColumn();
        if ($count < 1) {
            return [
                'ok' => false,
                'message' => 'Tabela migrations vazia. Importe o dump SQL completo do pacote.',
                'missing' => [],
            ];
        }
    } catch (Throwable $e) {
        return [
            'ok' => false,
            'message' => 'Não foi possível ler a tabela migrations: '.$e->getMessage(),
            'missing' => ['migrations'],
        ];
    }

    return [
        'ok' => true,
        'message' => 'Schema OK (SQL já importado).',
        'missing' => [],
    ];
}

if ($action === 'test-db') {
    $host = $input['db_host'] ?? '127.0.0.1';
    $port = (int) ($input['db_port'] ?? 3306);
    $dbname = $input['db_database'] ?? '';
    $user = $input['db_username'] ?? '';
    $pass = $input['db_password'] ?? '';
    if (empty($dbname) || empty($user)) {
        $sendJson(['success' => false, 'message' => 'Nome do banco e usuário são obrigatórios.']);
    }
    try {
        $dsn = "mysql:host=" . $host . ";port=" . $port . ";dbname=" . $dbname . ";charset=utf8mb4";
        $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $schemaCheck = install_validate_schema($pdo);
        $sendJson([
            'success' => true,
            'schema_ok' => $schemaCheck['ok'],
            'schema_message' => $schemaCheck['message'],
            'missing_tables' => $schemaCheck['missing'],
        ]);
    } catch (PDOException $e) {
        $sendJson(['success' => false, 'message' => $e->getMessage()]);
    }
}

if ($action === 'install-step') {
    @set_time_limit(600);
    @ini_set('max_execution_time', '600');

    $step = (int) ($input['step'] ?? 0);
    if ($step < 1 || $step > 4) {
        $sendJson(['success' => false, 'message' => 'Etapa inválida.']);
    }

    $dbHost = $input['db_host'] ?? '127.0.0.1';
    $dbPort = $input['db_port'] ?? '3306';
    $dbDatabase = $input['db_database'] ?? '';
    $dbUser = $input['db_username'] ?? '';
    $dbPass = $input['db_password'] ?? '';
    $appName = $input['app_name'] ?? 'Plataforma';
    $appUrl = rtrim($input['app_url'] ?? '', '/');
    $appEnv = 'production';
    $sessionDriver = $input['session_driver'] ?? 'file';

    if (empty($dbDatabase) || empty($dbUser)) {
        $sendJson(['success' => false, 'message' => 'Dados do banco incompletos.']);
    }

    // file session → database queue (Laravel has no QUEUE_CONNECTION=file)
    if ($sessionDriver === 'redis') {
        $queueDriver = 'redis';
        $cacheDriver = 'redis';
    } else {
        $sessionDriver = 'file';
        $queueDriver = 'database';
        $cacheDriver = 'file';
    }

    $envPath = $basePath . '/.env';
    $isDev = false;

    $phpBin = null;
    if (defined('PHP_BINARY') && PHP_BINARY) {
        $bin = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, PHP_BINARY);
        $name = strtolower(basename($bin));
        if (!in_array($name, ['httpd.exe', 'httpd', 'nginx', 'nginx.exe', 'apache.exe', 'apache2.exe'], true)) {
            $phpBin = $bin;
        }
    }
    if (!$phpBin && defined('PHP_BINDIR') && PHP_BINDIR) {
        $tryExe = rtrim(PHP_BINDIR, '\/') . DIRECTORY_SEPARATOR . 'php' . (DIRECTORY_SEPARATOR === '\\' ? '.exe' : '');
        if (file_exists($tryExe)) {
            $phpBin = $tryExe;
        }
    }
    if (!$phpBin && DIRECTORY_SEPARATOR === '\\') {
        foreach (['C:\\laragon\\bin\\php', 'C:\\xampp\\php', 'C:\\wamp64\\bin\\php', 'C:\\php'] as $dir) {
            if (!is_dir($dir)) {
                continue;
            }
            $versions = @scandir($dir);
            if (!$versions) {
                continue;
            }
            rsort($versions);
            foreach ($versions as $v) {
                if ($v === '.' || $v === '..' || !is_dir($dir . '\\' . $v)) {
                    continue;
                }
                $exe = $dir . '\\' . $v . '\\php.exe';
                if (file_exists($exe)) {
                    $phpBin = $exe;
                    break 2;
                }
            }
        }
    }
    $phpExe = $phpBin ?: 'php';
    $artisan = $basePath . DIRECTORY_SEPARATOR . 'artisan';
    $log = [];
    $procEnv = null;
    if (DIRECTORY_SEPARATOR !== '\\') {
        $path = getenv('PATH') ?: '';
        $procEnv = ['PATH' => '/usr/bin:/usr/local/bin' . ($path ? ':' . $path : '')];
    }
    $run = function ($cmdOrArgs, $cwd = null) use (&$log, $basePath, $phpExe, $procEnv) {
        $cwd = $cwd ?? $basePath;
        $isArray = is_array($cmdOrArgs);
        $cmd = $isArray ? implode(' ', array_map(fn ($a) => strpos($a, ' ') !== false ? '"' . str_replace('"', '""', $a) . '"' : $a, $cmdOrArgs)) : (string) $cmdOrArgs;
        $log[] = '$ ' . $cmd;

        // Hospedagens compartilhadas costumam desabilitar proc_open (fatal, não só false).
        if (! function_exists('proc_open')) {
            $log[] = 'proc_open indisponível neste PHP — pulando execução de processo.';

            return false;
        }

        $descriptor = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $procCmd = $isArray ? $cmdOrArgs : $cmd;
        $p = @proc_open($procCmd, $descriptor, $pipes, $cwd, $procEnv);
        if (!is_resource($p)) {
            $log[] = 'Erro ao executar comando.';
            return false;
        }
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);
        $out = '';
        $err = '';
        $write = [];
        $except = [];
        do {
            $status = proc_get_status($p);
            if (DIRECTORY_SEPARATOR !== '\\') {
                $read = [$pipes[1], $pipes[2]];
                if (@stream_select($read, $write, $except, 1) > 0) {
                    foreach ($read as $pipe) {
                        $chunk = stream_get_contents($pipe);
                        if ($pipe === $pipes[1]) {
                            $out .= $chunk;
                        } else {
                            $err .= $chunk;
                        }
                    }
                }
            } else {
                $out .= stream_get_contents($pipes[1]);
                $err .= stream_get_contents($pipes[2]);
                usleep(100000);
            }
        } while ($status['running']);
        $out .= stream_get_contents($pipes[1]);
        $err .= stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $code = proc_close($p);
        if ($out) {
            $log[] = trim($out);
        }
        if ($err) {
            $log[] = trim($err);
        }
        return $code === 0;
    };

    /** Fallback: executa comando no shell via popen (às vezes funciona quando proc_open falha ou PATH está vazio). */
    $runViaPopen = function (string $shellCmd) use (&$log, $basePath) {
        if (! function_exists('popen') || ! function_exists('pclose')) {
            $log[] = 'popen/pclose indisponíveis neste PHP.';

            return false;
        }
        $fullCmd = 'cd ' . escapeshellarg($basePath) . ' && ' . $shellCmd . ' 2>&1';
        $log[] = '(popen) $ ' . $shellCmd;
        $h = @popen($fullCmd, 'r');
        if (!is_resource($h)) {
            $log[] = 'popen falhou.';
            return false;
        }
        $out = stream_get_contents($h);
        $code = pclose($h);
        if ($out) {
            $log[] = trim($out);
        }
        return $code === 0;
    };

    /** Executa Composer em processo (sem proc_open/popen): carrega o phar e roda Application. */
    $runComposerInProcess = function (bool $noDev) use (&$log, $basePath, $sendJson, $logStr) {
        $composerPhar = $basePath . DIRECTORY_SEPARATOR . 'composer.phar';
        if (!is_file($composerPhar)) {
            return false;
        }
        $log[] = 'Executando Composer em processo (phar)...';
        $cwd = getcwd();
        try {
            chdir($basePath);
            putenv('COMPOSER_HOME=' . $basePath . '/.composer');
            $pharUri = 'phar://' . $composerPhar;
            $autoload = $pharUri . '/vendor/autoload.php';
            if (!is_file($autoload)) {
                $autoload = $pharUri . '/autoload.php';
            }
            if (!is_file($autoload)) {
                $log[] = 'Estrutura do phar não reconhecida.';
                return false;
            }
            require $autoload;
            $app = new \Composer\Console\Application();
            $app->setAutoExit(false);
            $input = new \Symfony\Component\Console\Input\ArrayInput([
                'command' => 'install',
                '--no-interaction' => true,
                '--no-dev' => $noDev,
                '--optimize-autoloader' => $noDev,
            ]);
            $output = new \Symfony\Component\Console\Output\StreamOutput(fopen('php://temp', 'w+'));
            $exitCode = $app->run($input, $output);
            rewind($output->getStream());
            $out = stream_get_contents($output->getStream());
            if ($out) {
                $log[] = trim($out);
            }
            return $exitCode === 0;
        } catch (Throwable $e) {
            $log[] = 'Composer em processo: ' . $e->getMessage();
            return false;
        } finally {
            chdir($cwd);
        }
    };

    $logStr = fn () => implode("\n", $log);

    if ($step === 1) {
        $envContent = "APP_NAME=\"" . addslashes($appName) . "\"
APP_ENV={$appEnv}
APP_KEY=
APP_DEBUG=false
APP_URL={$appUrl}
APP_INSTALLED=false

APP_LOCALE=pt
APP_FALLBACK_LOCALE=pt
APP_FAKER_LOCALE=pt_BR

APP_MAINTENANCE_DRIVER=file

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST={$dbHost}
DB_PORT={$dbPort}
DB_DATABASE={$dbDatabase}
DB_USERNAME=" . addslashes($dbUser) . "
DB_PASSWORD=\"" . addslashes($dbPass) . "\"

SESSION_DRIVER={$sessionDriver}
SESSION_LIFETIME=120
SESSION_ENCRYPT=true
SESSION_PATH=/

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION={$queueDriver}

CACHE_STORE={$cacheDriver}

REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

VITE_APP_NAME=\"" . addslashes($appName) . "\"

# PWA Painel: chaves VAPID (preenchidas pelo instalador ou php artisan pwa:vapid)
PWA_VAPID_PUBLIC=
PWA_VAPID_PRIVATE=

SHARED_HOSTING_QUEUE_DRAIN=true
";
        if (!file_put_contents($envPath, $envContent)) {
            $sendJson(['success' => false, 'message' => 'Não foi possível escrever o arquivo .env.']);
        }

        // Shared hosting: se vendor/ já veio no ZIP, não tenta Composer (proc_open costuma estar off).
        if (is_file($basePath . '/vendor/autoload.php')) {
            $log[] = 'vendor/autoload.php encontrado — pulando Composer (adequado para hospedagem compartilhada).';
            $log[] = 'proc_open: ' . (function_exists('proc_open') ? 'disponível' : 'indisponível');
            $sendJson(['success' => true, 'step' => 1, 'label' => 'Composer concluído (vendor existente)']);
        }

        $composerPhar = $basePath . DIRECTORY_SEPARATOR . 'composer.phar';
        $composerArgs = $isDev
            ? ['install', '--no-interaction']
            : ['install', '--no-interaction', '--no-dev', '--optimize-autoloader'];
        $composerOk = false;

        if (is_file($composerPhar)) {
            $composerOk = $run(array_merge([$phpExe, '-d', 'memory_limit=512M', $composerPhar], $composerArgs));
        }
        if (!$composerOk) {
            $composerOk = $run(array_merge(['composer'], $composerArgs));
        }
        if (!$composerOk && !is_file($composerPhar)) {
            $log[] = 'Baixando Composer (composer.phar)...';
            $phar = @file_get_contents('https://getcomposer.org/download/latest-stable/composer.phar');
            if ($phar && strlen($phar) > 10000) {
                if (file_put_contents($composerPhar, $phar)) {
                    $composerOk = $run(array_merge([$phpExe, '-d', 'memory_limit=512M', $composerPhar], $composerArgs));
                }
            } else {
                $log[] = 'Não foi possível baixar composer.phar.';
            }
        }
        if (!$composerOk) {
            $composerCmdStr = ($isDev ? 'composer install --no-interaction' : 'composer install --no-interaction --no-dev --optimize-autoloader');
            $log[] = 'Tentando via popen (shell)...';
            if (is_file($composerPhar)) {
                $composerOk = $runViaPopen('php -d memory_limit=512M composer.phar ' . ($isDev ? 'install --no-interaction' : 'install --no-interaction --no-dev --optimize-autoloader'));
            }
            if (!$composerOk) {
                $composerOk = $runViaPopen($composerCmdStr);
            }
        }
        if (!$composerOk && is_file($composerPhar)) {
            $composerOk = $runComposerInProcess(!$isDev);
        }
        if (!$composerOk && is_file($basePath . '/vendor/autoload.php')) {
            $log[] = '[Fallback] Composer falhou – usando vendor/ existente.';
            $composerOk = true;
        }
        if (!$composerOk) {
            $log[] = '[Aviso] Composer não executado (proc_open/popen podem estar desativados). Suba a pasta vendor ou rode composer install depois.';
            $sendJson([
                'success' => false,
                'message' => 'Não foi possível instalar dependências: esta hospedagem bloqueia proc_open e a pasta vendor/ não está no servidor. Faça upload do ZIP completo (com vendor/) e tente de novo.',
                'log' => $logStr(),
            ]);
        }
        $sendJson(['success' => true, 'step' => 1, 'label' => 'Composer concluído']);
    }

    if ($step === 2) {
        if (!is_file($basePath . '/vendor/autoload.php')) {
            $log[] = 'vendor/ não encontrado – executando composer install...';
            $log[] = 'proc_open disponível: ' . (function_exists('proc_open') ? 'sim' : 'não');
            $composerPhar = $basePath . DIRECTORY_SEPARATOR . 'composer.phar';
            $composerArgs = $isDev
                ? ['install', '--no-interaction']
                : ['install', '--no-interaction', '--no-dev', '--optimize-autoloader'];
            $composerOk = false;
            if (!is_file($composerPhar)) {
                $log[] = 'Baixando composer.phar...';
                $phar = @file_get_contents('https://getcomposer.org/download/latest-stable/composer.phar');
                if ($phar && strlen($phar) > 10000) {
                    file_put_contents($composerPhar, $phar);
                }
            }
            if (is_file($composerPhar)) {
                $composerOk = $run(array_merge([$phpExe, '-d', 'memory_limit=512M', $composerPhar], $composerArgs));
            }
            if (!$composerOk) {
                $composerOk = $run(array_merge(['composer'], $composerArgs));
            }
            if (!$composerOk) {
                $log[] = 'Tentando via popen (shell)...';
                if (is_file($composerPhar)) {
                    $composerOk = $runViaPopen('php -d memory_limit=512M composer.phar install --no-interaction --no-dev --optimize-autoloader');
                }
                if (!$composerOk) {
                    $composerOk = $runViaPopen('composer install --no-interaction --no-dev --optimize-autoloader');
                }
            }
            if (!$composerOk && is_file($composerPhar)) {
                $composerOk = $runComposerInProcess(true);
            }
            if (!is_file($basePath . '/vendor/autoload.php')) {
                $log[] = '[Aviso] vendor/ não encontrado. Suba a pasta vendor (composer install local + upload) e recarregue, ou use SSH.';
                $manualCmd = 'cd ' . str_replace([' ', '"'], ['\ ', '\"'], $basePath) . ' && php composer.phar install --no-interaction --no-dev --optimize-autoloader';
                $sendJson([
                    'success' => false,
                    'message' => 'Pasta vendor não encontrada. Suba o projeto com a pasta vendor ou rode composer install (SSH) e recarregue.',
                    'log' => $logStr() . "\n\n--- Comando manual (SSH) ---\n" . $manualCmd,
                ]);
            }
        }
        if (!$run([$phpExe, $artisan, 'key:generate', '--force'])) {
            // Fallback: gera APP_KEY manualmente (artisan pode falhar em hospedagens restritas)
            $key = 'base64:' . base64_encode(random_bytes(32));
            $envContent = file_get_contents($envPath);
            $updated = preg_replace('/^APP_KEY\s*=.*$/m', 'APP_KEY=' . $key, $envContent);
            if ($updated === $envContent) {
                $updated = preg_replace('/^(APP_DEBUG=)/m', "APP_KEY={$key}\n$1", $envContent);
            }
            if (!file_put_contents($envPath, $updated)) {
                $sendJson(['success' => false, 'message' => 'Não foi possível definir APP_KEY.', 'log' => $logStr()]);
            }
            $log[] = '[Fallback] APP_KEY gerada manualmente.';
        }

        // NÃO roda migrate — o cliente importa o SQL manualmente (phpMyAdmin).
        try {
            $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbDatabase};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $schemaCheck = install_validate_schema($pdo);
            $log[] = $schemaCheck['message'];
            if (! $schemaCheck['ok']) {
                if ($schemaCheck['missing'] !== []) {
                    $log[] = 'Tabelas ausentes: '.implode(', ', $schemaCheck['missing']);
                }
                $sendJson([
                    'success' => false,
                    'message' => $schemaCheck['message'],
                    'log' => $logStr(),
                ]);
            }
        } catch (PDOException $e) {
            $sendJson([
                'success' => false,
                'message' => 'Não foi possível validar o schema: '.$e->getMessage(),
                'log' => $logStr(),
            ]);
        }

        $sendJson(['success' => true, 'step' => 2, 'label' => 'Schema validado (SQL importado)']);
    }

    if ($step === 3) {
        $npmCmd = 'npm install && npm run build';
        if (!$run($npmCmd)) {
            // Fallback: hospedagem pode não ter Node.js – permite seguir usando public/build pré-compilado
            $log[] = '[Aviso] npm não disponível ou falhou – usando public/build existente.';
        }
        $sendJson(['success' => true, 'step' => 3, 'label' => 'Build concluído']);
    }

    if ($step === 4) {
        $dirs = [
            $basePath . '/storage/framework/cache/data',
            $basePath . '/storage/framework/sessions',
            $basePath . '/storage/framework/views',
            $basePath . '/storage/logs',
            $basePath . '/bootstrap/cache',
        ];
        foreach ($dirs as $d) {
            if (!is_dir($d)) {
                @mkdir($d, 0755, true);
            }
        }
        $run([$phpExe, $artisan, 'storage:link']);
        // Fallback sem artisan: symlink/junction public/storage → storage/app/public
        $publicStorage = $basePath.'/public/storage';
        $storageAppPublic = $basePath.'/storage/app/public';
        if (! is_dir($storageAppPublic)) {
            @mkdir($storageAppPublic, 0755, true);
        }
        if (! file_exists($publicStorage) && ! is_link($publicStorage)) {
            if (function_exists('symlink')) {
                @symlink($storageAppPublic, $publicStorage);
            }
            if (! file_exists($publicStorage) && ! is_link($publicStorage)) {
                $log[] = '[Aviso] Não foi possível criar public/storage. Crie o link manualmente no File Manager se precisar de uploads públicos.';
            } else {
                $log[] = '[Fallback] Link public/storage criado sem artisan.';
            }
        }
        if (!$run([$phpExe, $artisan, 'pwa:vapid'])) {
            try {
                $autoload = $basePath . '/vendor/autoload.php';
                if (is_file($autoload)) {
                    require $autoload;
                    $app = require $basePath . '/bootstrap/app.php';
                    $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
                    $app->make(\Illuminate\Contracts\Console\Kernel::class)->call('pwa:vapid');
                    $log[] = '[Fallback] Chaves VAPID geradas no .env (opcional).';
                }
            } catch (Throwable $e) {
                $log[] = '[Aviso] pwa:vapid opcional: ' . $e->getMessage() . ' – configure push em Plataforma → App.';
            }
        } else {
            $log[] = '[Info] Chaves VAPID no .env. Você também pode usar Plataforma → App → Notificações push (VAPID ou Firebase).';
        }
        $cronSecret = bin2hex(random_bytes(24));
        $envContent = file_get_contents($envPath);
        if (! preg_match('/^\s*CRON_SECRET\s*=/mi', $envContent)) {
            $envContent .= "\nCRON_SECRET={$cronSecret}\n";
        } else {
            $envContent = preg_replace('/^\s*CRON_SECRET\s*=.*$/mi', 'CRON_SECRET='.$cronSecret, $envContent) ?? $envContent;
        }
        $envContent = preg_replace('/^APP_INSTALLED\s*=.*$/mi', 'APP_INSTALLED=true', $envContent) ?? $envContent;
        file_put_contents($envPath, $envContent);
        $run([$phpExe, $artisan, 'config:cache']);
        $run([$phpExe, $artisan, 'route:cache']);
        $run([$phpExe, $artisan, 'view:cache']);
        $storageApp = $basePath . '/storage/app';
        if (! is_dir($storageApp)) {
            @mkdir($storageApp, 0755, true);
        }
        $cronUrl = rtrim($appUrl, '/').'/cron?token='.$cronSecret;
        $installPath = __DIR__;
        $parentPath = dirname($installPath);
        $newPath = $parentPath . '/.install';
        if (is_dir($installPath) && ! is_dir($newPath)) {
            @rename($installPath, $newPath);
        }
        $sendJson([
            'success' => true,
            'step' => 4,
            'redirect' => '/criar-admin',
            'cron_url' => $cronUrl,
            'cron_secret' => $cronSecret,
            'label' => 'Instalação finalizada',
        ]);
    }
}

// Ação desconhecida
ob_end_clean();
echo json_encode(['success' => false, 'message' => 'Ação desconhecida.']);
