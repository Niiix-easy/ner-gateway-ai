<?php

namespace App\Support;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;

class DockerEnvBootstrap
{
    public static function ensureAppKey(): void
    {
        $current = (string) config('app.key', '');
        if ($current !== '' && str_starts_with($current, 'base64:')) {
            return;
        }

        // Shared hosting / sem Docker: lê .env direto (config cache pode estar vazio).
        $fromEnv = self::readEnvValue('APP_KEY');
        if (is_string($fromEnv) && str_starts_with($fromEnv, 'base64:') && strlen($fromEnv) > 20) {
            config(['app.key' => $fromEnv]);

            return;
        }

        $key = '';
        if (DockerSetupState::isDocker()) {
            $keyPath = base_path('.docker/app.key');
            try {
                if (! is_file($keyPath)) {
                    if (! is_dir(dirname($keyPath))) {
                        @mkdir(dirname($keyPath), 0777, true);
                    }
                    @file_put_contents($keyPath, 'base64:'.base64_encode(random_bytes(32)));
                }
                $key = trim((string) @file_get_contents($keyPath));
            } catch (\Throwable) {
                $key = '';
            }
        }

        if ($key === '' || ! str_starts_with($key, 'base64:')) {
            $key = 'base64:'.base64_encode(random_bytes(32));
        }

        try {
            self::upsertEnvValue('APP_KEY', $key);
        } catch (\Throwable) {
            // sem permissão de escrita no .env — ainda aplica em memória nesta request
        }
        config(['app.key' => $key]);
    }

    public static function readEnvValue(string $key): ?string
    {
        $envPath = base_path('.env');
        if (! is_file($envPath)) {
            return null;
        }
        $content = str_replace("\r\n", "\n", (string) file_get_contents($envPath));
        if (! preg_match('/^\s*'.preg_quote($key, '/').'\s*=\s*(.*)$/m', $content, $m)) {
            return null;
        }
        $value = trim((string) ($m[1] ?? ''));
        $value = trim($value, " \t\"'");

        return $value === '' ? null : $value;
    }

    public static function ensureUsersSchemaReady(): void
    {
        try {
            if (Schema::hasTable('users') && Schema::hasColumn('users', 'role')) {
                return;
            }
        } catch (\Throwable) {
            // Sem conexão/DB: não tenta migrate aqui (evita 500 em /criar-admin).
            return;
        }

        // Em Docker o entrypoint já migra. Em shared hosting o SQL é importado manualmente.
        // Só tenta migrate se a tabela users realmente não existir.
        try {
            if (! Schema::hasTable('users')) {
                Artisan::call('migrate', ['--force' => true]);
            }
        } catch (\Throwable) {
            //
        }
    }

    public static function upsertEnvValue(string $key, string $value): void
    {
        $envPath = base_path('.env');
        if (! is_file($envPath)) {
            copy(base_path('.env.example'), $envPath);
        }

        $content = (string) file_get_contents($envPath);
        $content = self::replaceEnvLine($content, $key, $value);
        file_put_contents($envPath, str_replace("\r\n", "\n", $content));
    }

    /**
     * @param  array<string, string>  $vars
     */
    public static function mergeSharedEnvFile(string $path, array $vars): void
    {
        $dir = dirname($path);
        if (! is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $content = is_file($path) ? (string) file_get_contents($path) : '';
        $content = str_replace("\r\n", "\n", $content);
        foreach ($vars as $key => $value) {
            $content = self::replaceEnvLine($content, $key, $value);
        }

        file_put_contents($path, $content === '' ? '' : rtrim($content, "\n")."\n");
    }

    /**
     * @return array<string, string>
     */
    public static function parseEnvFile(string $path): array
    {
        if (! is_file($path)) {
            return [];
        }

        $out = [];
        $content = str_replace("\r\n", "\n", (string) file_get_contents($path));
        foreach (explode("\n", $content) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (! preg_match('/^([A-Z0-9_]+)\s*=\s*(.*)$/', $line, $m)) {
                continue;
            }
            $value = trim((string) ($m[2] ?? ''));
            $value = trim($value, " \t\"'");
            $out[(string) $m[1]] = $value;
        }

        return $out;
    }

    public static function replaceEnvLine(string $content, string $key, string $value): string
    {
        $content = str_replace("\r\n", "\n", $content);
        $needsQuotes = (bool) preg_match('/\s|#|"|\'/', $value);
        $line = $key.'='.($needsQuotes ? ('"'.str_replace('"', '\\"', $value).'"') : $value);
        $pattern = '/^\s*'.preg_quote($key, '/').'\s*=.*$/m';

        if (preg_match($pattern, $content)) {
            return (string) preg_replace($pattern, $line, $content);
        }

        return rtrim($content, "\r\n")."\n".$line."\n";
    }

    public static function friendlyDatabaseError(\Throwable $e): ?string
    {
        if (! $e instanceof QueryException) {
            return null;
        }

        $message = $e->getMessage();
        if (str_contains($message, 'does not exist') || str_contains($message, '42P01')) {
            return 'Banco ainda não migrado. Aguarde o container terminar o boot e tente novamente.';
        }

        return null;
    }
}
