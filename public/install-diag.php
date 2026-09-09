<?php
/**
 * Diagnóstico rápido pós-install (shared hosting).
 * Acesse: https://seudominio.com/install-diag.php
 * APAGUE este arquivo depois de resolver.
 */
declare(strict_types=1);

header('Content-Type: text/plain; charset=UTF-8');

$public = __DIR__;
$base = dirname($public);
$lines = [];
$ok = static function (string $label, bool $pass, string $detail = '') use (&$lines): void {
    $lines[] = ($pass ? '[OK]  ' : '[FAIL] ').$label.($detail !== '' ? ' — '.$detail : '');
};

$ok('base_path', is_dir($base), $base);
$ok('.env', is_file($base.'/.env'));
$ok('vendor/autoload.php', is_file($base.'/vendor/autoload.php'));
$ok('public/build/manifest.json', is_file($public.'/build/manifest.json'));

$manifestPath = $public.'/build/manifest.json';
if (is_file($manifestPath)) {
    $manifest = json_decode((string) file_get_contents($manifestPath), true);
    $ok('manifest JSON válido', is_array($manifest));
    $ok('entry resources/js/app.js', is_array($manifest) && isset($manifest['resources/js/app.js']));
    $ok('entry resources/css/app.css', is_array($manifest) && isset($manifest['resources/css/app.css']));
}

$storage = [
    $base.'/storage/logs',
    $base.'/storage/framework/sessions',
    $base.'/storage/framework/cache/data',
    $base.'/storage/framework/views',
    $base.'/bootstrap/cache',
];
foreach ($storage as $dir) {
    if (! is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $ok('writable '.$dir, is_dir($dir) && is_writable($dir));
}

$env = is_file($base.'/.env') ? (string) file_get_contents($base.'/.env') : '';
$get = static function (string $key) use ($env): string {
    if (! preg_match('/^\s*'.preg_quote($key, '/').'\s*=\s*(.*)$/m', $env, $m)) {
        return '';
    }
    return trim(trim((string) $m[1]), "\"'");
};

$appKey = $get('APP_KEY');
$ok('APP_KEY preenchida', str_starts_with($appKey, 'base64:') && strlen($appKey) > 20, substr($appKey, 0, 12).'...');
$ok('APP_INSTALLED=true', (bool) preg_match('/^\s*APP_INSTALLED\s*=\s*["\']?true["\']?\s*$/mi', $env));
$ok('DB_PORT != 3307', $get('DB_PORT') !== '3307', 'DB_PORT='.$get('DB_PORT'));

$dbHost = $get('DB_HOST') ?: '127.0.0.1';
$dbPort = (int) ($get('DB_PORT') ?: 3306);
$dbName = $get('DB_DATABASE');
$dbUser = $get('DB_USERNAME');
$dbPass = $get('DB_PASSWORD');

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
    );
    $ok('MySQL conexão', true, "{$dbHost}:{$dbPort}/{$dbName}");
    $tables = $pdo->query("SHOW TABLES LIKE 'users'")->fetchAll();
    $ok('tabela users', count($tables) > 0);
    if (count($tables) > 0) {
        $cols = $pdo->query('SHOW COLUMNS FROM users LIKE \'role\'')->fetchAll();
        $ok('coluna users.role', count($cols) > 0);
        $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $ok('users count', true, (string) $count);
    }
} catch (Throwable $e) {
    $ok('MySQL conexão', false, $e->getMessage());
    $lines[] = 'DICA: na Hostinger tente DB_HOST=localhost (em vez de 127.0.0.1).';
}

$logFile = $base.'/storage/logs/laravel.log';
if (is_file($logFile)) {
    $lines[] = '';
    $lines[] = '=== Últimas linhas de storage/logs/laravel.log ===';
    $content = (string) @file_get_contents($logFile);
    $tail = implode("\n", array_slice(preg_split("/\r\n|\n|\r/", $content) ?: [], -40));
    $lines[] = $tail !== '' ? $tail : '(vazio)';
} else {
    $lines[] = '';
    $lines[] = '[WARN] storage/logs/laravel.log ainda não existe (erro pode estar só no display_errors do host).';
}

$lines[] = '';
$lines[] = 'proc_open: '.(function_exists('proc_open') ? 'sim' : 'NÃO');
$lines[] = 'PHP: '.PHP_VERSION;
$lines[] = '';
$lines[] = 'APAGUE este arquivo (public/install-diag.php) depois do diagnóstico.';

echo implode("\n", $lines)."\n";
