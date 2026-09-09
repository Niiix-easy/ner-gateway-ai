<?php

namespace App\Http\Controllers;

use App\Support\DockerSetupState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

class UpdateController extends Controller
{
    /*
    | Build white label: não existe repositório upstream. Se você mantiver o
    | seu próprio fork, defina PLATFORM_UPDATE_GITHUB_REPO no formato
    | "usuario/repositorio" e PLATFORM_UPDATES_ENABLED=true. Enquanto estiver
    | vazio, a checagem de versão e a atualização pela interface ficam inertes.
    */
    private static function githubRepo(): string
    {
        return trim((string) env('PLATFORM_UPDATE_GITHUB_REPO', ''), " /\t\n\r");
    }

    private static function githubReleasesLatestUrl(): string
    {
        $repo = self::githubRepo();

        return $repo === '' ? '' : 'https://api.github.com/repos/'.$repo.'/releases/latest';
    }

    private static function githubTagsUrl(): string
    {
        $repo = self::githubRepo();

        return $repo === '' ? '' : 'https://api.github.com/repos/'.$repo.'/tags';
    }

    private static function dockerManualUpdateCommand(): string
    {
        $repo = self::githubRepo();

        return $repo === ''
            ? 'Atualize pelo seu próprio fluxo de deploy (git pull / nova imagem Docker).'
            : 'bash -c "$(curl -fsSL https://raw.githubusercontent.com/'.$repo.'/main/update.sh)"';
    }

    private static function readInstalledVersion(): string
    {
        $versionFile = base_path('VERSION');
        $raw = trim((is_file($versionFile) ? (string) file_get_contents($versionFile) : '') ?: '');
        if ($raw !== '') {
            return $raw;
        }

        return (string) config('platform.version');
    }

    /**
     * Ensure string is valid UTF-8 for JSON (avoids "Malformed UTF-8" on Windows console output).
     */
    private static function toUtf8(string $str): string
    {
        if ($str === '') {
            return $str;
        }
        $utf8 = @mb_convert_encoding($str, 'UTF-8', 'UTF-8');
        if ($utf8 !== false) {
            return $utf8;
        }
        if (function_exists('iconv')) {
            $cleaned = @iconv('UTF-8', 'UTF-8//IGNORE', $str);
            if ($cleaned !== false) {
                return $cleaned;
            }
        }
        return preg_replace('/[^\x20-\x7E\x0A\x0D]/', '?', $str);
    }

    /**
     * Normalize version string (strip "v" prefix).
     */
    private static function normalizeVersion(string $tag): string
    {
        return ltrim(trim($tag), 'v');
    }

    /**
     * Get latest version from GitHub tags API (fallback when there are no releases).
     */
    private function getLatestFromTags(): ?string
    {
        $res = Http::timeout(10)
            ->withHeaders(['Accept' => 'application/vnd.github+json'])
            ->get(self::githubTagsUrl());

        if (! $res->successful()) {
            return null;
        }

        $tags = $res->json();
        if (! is_array($tags) || empty($tags)) {
            return null;
        }

        $latest = null;
        foreach ($tags as $tag) {
            $name = $tag['name'] ?? '';
            $ver = self::normalizeVersion((string) $name);
            if ($ver === '') {
                continue;
            }
            if (! preg_match('/^\d+\.\d+(\.\d+)?/', $ver)) {
                continue;
            }
            if ($latest === null || version_compare($ver, $latest, '>')) {
                $latest = $ver;
            }
        }

        return $latest;
    }

    private static function canRunProcess(): bool
    {
        if (! function_exists('proc_open')) {
            return false;
        }
        $disabled = ini_get('disable_functions');
        if (! is_string($disabled) || trim($disabled) === '') {
            return true;
        }
        $parts = array_map('trim', explode(',', $disabled));
        return ! in_array('proc_open', $parts, true);
    }

    private static function isWindows(): bool
    {
        return DIRECTORY_SEPARATOR === '\\';
    }

    private static function ensureWritableDir(string $path): bool
    {
        try {
            if (! is_dir($path)) {
                File::makeDirectory($path, 0755, true);
            }
        } catch (\Throwable $e) {
            return false;
        }

        return is_dir($path) && is_writable($path);
    }

    private static function copyTree(string $sourceDir, string $targetDir, array $preserveTopLevel, array $preserveRelativePaths = []): array
    {
        $sourceDir = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $sourceDir), DIRECTORY_SEPARATOR);
        $targetDir = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $targetDir), DIRECTORY_SEPARATOR);

        $copied = 0;
        $skipped = 0;
        $errors = [];
        $preserveRelativePaths = array_values(array_filter(array_map(fn ($p) => str_replace(['\\', '/'], '/', trim((string) $p, '/')), $preserveRelativePaths), fn ($p) => $p !== ''));

        $files = File::allFiles($sourceDir);
        foreach ($files as $file) {
            $path = $file->getPathname();
            $relative = ltrim(str_replace($sourceDir, '', $path), DIRECTORY_SEPARATOR);
            $relativeNormalized = str_replace(['\\', '/'], '/', $relative);
            if ($relativeNormalized === '' || str_contains($relativeNormalized, '..')) {
                $skipped++;
                continue;
            }

            if (in_array($relativeNormalized, $preserveRelativePaths, true)) {
                $skipped++;
                continue;
            }

            $parts = explode('/', $relativeNormalized);
            $top = $parts[0] ?? '';
            if ($top !== '' && in_array($top, $preserveTopLevel, true)) {
                $skipped++;
                continue;
            }

            $targetPath = $targetDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativeNormalized);
            $targetParent = dirname($targetPath);
            if (! is_dir($targetParent)) {
                try {
                    File::makeDirectory($targetParent, 0755, true);
                } catch (\Throwable $e) {
                    $errors[] = 'Falha ao criar diretório: ' . $relativeNormalized;
                    continue;
                }
            }

            try {
                if (! @copy($path, $targetPath)) {
                    $errors[] = 'Falha ao copiar: ' . $relativeNormalized;
                    continue;
                }
                $copied++;
            } catch (\Throwable $e) {
                $errors[] = 'Falha ao copiar: ' . $relativeNormalized;
            }
        }

        return ['copied' => $copied, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * Copia plugins do pacote de update para plugins/ sem remover slugs já instalados
     * que não venham no ZIP (ex.: feature baixada da loja).
     *
     * @return array{merged: int, errors: list<string>}
     */
    private static function mergeBundledPluginsFromUpdate(string $sourceDir, string $pluginsTargetDir): array
    {
        $sourcePlugins = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $sourceDir), DIRECTORY_SEPARATOR)
            .DIRECTORY_SEPARATOR.'plugins';
        $pluginsTargetDir = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $pluginsTargetDir), DIRECTORY_SEPARATOR);
        $merged = 0;
        $errors = [];

        if (! is_dir($sourcePlugins)) {
            return ['merged' => 0, 'errors' => []];
        }

        if (! is_dir($pluginsTargetDir)) {
            try {
                File::makeDirectory($pluginsTargetDir, 0755, true);
            } catch (\Throwable) {
                return ['merged' => 0, 'errors' => ['Falha ao criar diretório plugins/']];
            }
        }

        $dirs = @scandir($sourcePlugins) ?: [];
        foreach ($dirs as $name) {
            if ($name === '.' || $name === '..') {
                continue;
            }
            $src = $sourcePlugins.DIRECTORY_SEPARATOR.$name;
            if (! is_dir($src) || ! is_file($src.DIRECTORY_SEPARATOR.'plugin.json')) {
                continue;
            }
            $dest = $pluginsTargetDir.DIRECTORY_SEPARATOR.$name;
            try {
                if (! is_dir($dest)) {
                    File::makeDirectory($dest, 0755, true);
                }
                File::copyDirectory($src, $dest);
                $merged++;
            } catch (\Throwable $e) {
                $errors[] = 'Plugin '.$name.': '.$e->getMessage();
            }
        }

        return ['merged' => $merged, 'errors' => $errors];
    }

    private function resolveLatestTagRaw(): array
    {
        $res = Http::timeout(10)
            ->withHeaders(['Accept' => 'application/vnd.github+json'])
            ->get(self::githubReleasesLatestUrl());

        if ($res->successful()) {
            $data = $res->json();
            $tagName = (string) ($data['tag_name'] ?? '');
            $body = $data['body'] ?? null;
            return ['tag' => $tagName, 'changelog' => $body];
        }

        $tags = Http::timeout(10)
            ->withHeaders(['Accept' => 'application/vnd.github+json'])
            ->get(self::githubTagsUrl());
        if (! $tags->successful()) {
            return ['tag' => null, 'changelog' => null];
        }
        $list = $tags->json();
        if (! is_array($list) || empty($list)) {
            return ['tag' => null, 'changelog' => null];
        }

        $latestTagRaw = null;
        $latestNorm = null;
        foreach ($list as $tag) {
            $name = (string) ($tag['name'] ?? '');
            $norm = self::normalizeVersion($name);
            if ($norm === '' || ! preg_match('/^\d+\.\d+(\.\d+)?/', $norm)) {
                continue;
            }
            if ($latestNorm === null || version_compare($norm, $latestNorm, '>')) {
                $latestNorm = $norm;
                $latestTagRaw = $name;
            }
        }

        return ['tag' => $latestTagRaw, 'changelog' => null];
    }

    private static function withDockerManualHint(string $message): string
    {
        if (! DockerSetupState::isDocker()) {
            return $message;
        }

        return rtrim($message) . "\n\n" .
            "Se você está usando VPS com Docker e a atualização pelo painel falhar, faça manualmente no terminal da VPS:\n" .
            self::dockerManualUpdateCommand();
    }

    private static function cleanupViteHotFiles(): array
    {
        $paths = [
            public_path('hot'),
            storage_path('framework/vite.hot'),
        ];

        $deleted = [];
        $errors = [];

        foreach ($paths as $path) {
            if (! is_file($path)) {
                continue;
            }
            try {
                if (File::delete($path)) {
                    $deleted[] = $path;
                } else {
                    $errors[] = $path;
                }
            } catch (\Throwable) {
                $errors[] = $path;
            }
        }

        return ['deleted' => $deleted, 'errors' => $errors];
    }

    private function runArchiveUpdate(string $basePath, string $branch): array
    {
        if (! class_exists('ZipArchive')) {
            return ['ok' => false, 'message' => 'A extensão PHP Zip não está habilitada.', 'details' => []];
        }

        $tmpDir = storage_path('app' . DIRECTORY_SEPARATOR . '.update-tmp');
        if (! self::ensureWritableDir($tmpDir)) {
            $tmpDir = sys_get_temp_dir();
        }

        $meta = $this->resolveLatestTagRaw();
        $tagRaw = is_string($meta['tag'] ?? null) && ($meta['tag'] ?? '') !== '' ? (string) $meta['tag'] : null;
        $repo = self::githubRepo();
        $archiveUrl = $tagRaw
            ? 'https://github.com/' . $repo . '/archive/refs/tags/' . rawurlencode($tagRaw) . '.zip'
            : 'https://github.com/' . $repo . '/archive/refs/heads/' . rawurlencode($branch) . '.zip';

        $zipFile = rtrim($tmpDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'platform_update_' . Str::random(8) . '.zip';

        try {
            $res = Http::timeout(120)->withOptions(['sink' => $zipFile])->get($archiveUrl);
            if (! $res->successful() || ! is_file($zipFile) || filesize($zipFile) === 0) {
                @unlink($zipFile);
                return ['ok' => false, 'message' => 'Falha ao baixar o pacote de atualização.', 'details' => []];
            }
        } catch (\Throwable $e) {
            @unlink($zipFile);
            return ['ok' => false, 'message' => 'Erro ao baixar o pacote de atualização: ' . $e->getMessage(), 'details' => []];
        }

        $zip = new \ZipArchive;
        if ($zip->open($zipFile) !== true) {
            @unlink($zipFile);
            return ['ok' => false, 'message' => 'Arquivo ZIP inválido.', 'details' => []];
        }

        $entries = [];
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = (string) $zip->getNameIndex($i);
            if (str_contains($name, '..')) {
                $zip->close();
                @unlink($zipFile);
                return ['ok' => false, 'message' => 'Arquivo ZIP inválido.', 'details' => []];
            }
            $entries[] = $name;
        }

        $extractTo = rtrim($tmpDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'platform_extract_' . Str::random(8);
        try {
            if (is_dir($extractTo)) {
                File::deleteDirectory($extractTo);
            }
            File::makeDirectory($extractTo, 0755, true);
        } catch (\Throwable $e) {
            $zip->close();
            @unlink($zipFile);
            return ['ok' => false, 'message' => 'Erro ao preparar extração.', 'details' => []];
        }

        $zip->extractTo($extractTo);
        $zip->close();

        $baseInZip = null;
        foreach ($entries as $name) {
            $parts = explode('/', str_replace('\\', '/', trim((string) $name, '/')));
            $first = $parts[0] ?? '';
            if ($first === '' || $first === '.' || $first === '..') {
                continue;
            }
            if ($baseInZip === null) {
                $baseInZip = $first;
            } elseif ($baseInZip !== $first) {
                $baseInZip = '';
                break;
            }
        }

        $sourceDir = ($baseInZip && is_dir($extractTo . DIRECTORY_SEPARATOR . $baseInZip))
            ? $extractTo . DIRECTORY_SEPARATOR . $baseInZip
            : $extractTo;

        $preserveTopLevel = ['.env', '.git', '.install', 'storage', 'node_modules'];
        $preserveRelativePaths = ['database/database.sqlite'];
        $result = self::copyTree($sourceDir, $basePath, $preserveTopLevel, $preserveRelativePaths);
        // plugins/ é mesclado (não apaga installs do usuário; atualiza/adiciona os do release).
        $pluginMerge = self::mergeBundledPluginsFromUpdate($sourceDir, $basePath.DIRECTORY_SEPARATOR.'plugins');
        $result['plugins_merged'] = $pluginMerge['merged'] ?? 0;
        $result['plugins_errors'] = $pluginMerge['errors'] ?? [];
        self::cleanupViteHotFiles();

        File::deleteDirectory($extractTo);
        @unlink($zipFile);

        if (! empty($result['errors'])) {
            return [
                'ok' => false,
                'message' => 'Atualização aplicada parcialmente. Alguns arquivos não puderam ser copiados.',
                'details' => $result,
            ];
        }

        return [
            'ok' => true,
            'message' => 'Arquivos atualizados com sucesso.',
            'details' => $result,
            'tag' => $tagRaw ? self::normalizeVersion($tagRaw) : null,
            'changelog' => $meta['changelog'] ?? null,
        ];
    }

    private static function remoteUpdatesManaged(): bool
    {
        // Sem gestor remoto de atualizações nesta build white label.
        return false;
    }

    /**
     * Check for updates (GitHub Releases API, fallback to Tags API).
     */
    public function check(): JsonResponse
    {
        if (self::remoteUpdatesManaged()) {
            return response()->json([
                'current' => self::readInstalledVersion(),
                'latest' => null,
                'available' => false,
                'error' => null,
                'changelog_remote' => 'Atualizações remotas não estão disponíveis nesta instalação.',
                'remote_managed' => true,
            ]);
        }

        $current = self::readInstalledVersion();
        $response = [
            'current' => $current,
            'latest' => null,
            'available' => false,
            'error' => null,
            'changelog_remote' => null,
        ];

        // Sem repositório upstream configurado não há o que checar.
        if (self::githubRepo() === '') {
            $response['error'] = 'Nenhum repositório de atualização configurado nesta instalação. '
                .'Atualize pelo seu próprio fluxo de deploy e mantenha o arquivo VERSION alinhado.';

            return response()->json($response);
        }

        try {
            $res = Http::timeout(10)
                ->withHeaders(['Accept' => 'application/vnd.github+json'])
                ->get(self::githubReleasesLatestUrl());

            if ($res->successful()) {
                $data = $res->json();
                $tagName = $data['tag_name'] ?? '';
                $latest = self::normalizeVersion((string) $tagName);
                $response['latest'] = $latest;
                $response['changelog_remote'] = $data['body'] ?? null;

                if ($latest !== '' && version_compare($latest, $current, '>')) {
                    $response['available'] = true;
                }

                return response()->json($response);
            }

            if ($res->status() === 404) {
                $latestFromTags = $this->getLatestFromTags();
                if ($latestFromTags !== null) {
                    $response['latest'] = $latestFromTags;
                    if (version_compare($latestFromTags, $current, '>')) {
                        $response['available'] = true;
                    }
                    $response['error'] = null;

                    return response()->json($response);
                }
                $response['error'] = 'Nenhuma release nem tag de versão encontrada. Crie uma Release ou uma tag (ex: v1.0.0) no GitHub.';

                return response()->json($response);
            }

            $response['error'] = 'Não foi possível verificar atualizações. Tente novamente mais tarde.';

            return response()->json($response);
        } catch (\Throwable $e) {
            $response['error'] = 'Erro ao verificar: ' . $e->getMessage();
        }

        return response()->json($response);
    }

    public function integrity(): JsonResponse
    {
        $response = [
            'repository_exists' => null,
            'total_migrations' => 0,
            'ran_count' => 0,
            'pending_count' => 0,
            'pending' => [],
            'pending_truncated' => false,
            'error' => null,
        ];

        try {
            $migrator = app('migrator');
            if (! $migrator || ! method_exists($migrator, 'getMigrationFiles') || ! method_exists($migrator, 'getRepository')) {
                return response()->json([
                    ...$response,
                    'error' => 'Migrator indisponível.',
                ], 500);
            }

            $paths = [];
            $defaultPath = database_path('migrations');
            if (is_dir($defaultPath)) {
                $paths[] = $defaultPath;
            }
            if (method_exists($migrator, 'paths')) {
                $customPaths = $migrator->paths();
                if (is_array($customPaths)) {
                    $paths = array_merge($paths, $customPaths);
                }
            }
            $paths = array_values(array_unique(array_filter($paths, fn ($p) => is_string($p) && $p !== '')));

            $files = $migrator->getMigrationFiles($paths);
            if (! is_array($files)) {
                $files = [];
            }

            $repositoryExists = method_exists($migrator, 'repositoryExists') ? (bool) $migrator->repositoryExists() : null;
            $response['repository_exists'] = $repositoryExists;
            $response['total_migrations'] = count($files);

            $ran = [];
            $repo = $migrator->getRepository();
            if ($repositoryExists && $repo && method_exists($repo, 'getRan')) {
                $ran = $repo->getRan();
                if (! is_array($ran)) {
                    $ran = [];
                }
            }
            $response['ran_count'] = count($ran);

            $pending = [];
            foreach ($files as $name => $path) {
                if (! is_string($name) || $name === '') {
                    continue;
                }
                if (in_array($name, $ran, true)) {
                    continue;
                }
                $pending[] = $name;
            }

            $response['pending_count'] = count($pending);
            $maxList = 50;
            $response['pending'] = array_slice($pending, 0, $maxList);
            $response['pending_truncated'] = count($pending) > $maxList;
        } catch (\Throwable $e) {
            $response['error'] = 'Erro ao verificar integridade: ' . self::toUtf8($e->getMessage());
        }

        return response()->json($response);
    }

    public function migrateNow(Request $request): JsonResponse|RedirectResponse
    {
        try {
            \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
            $output = (string) \Illuminate\Support\Facades\Artisan::output();

            try {
                \Illuminate\Support\Facades\Artisan::call('config:cache');
            } catch (\Throwable) {
            }

            $msg = 'Migrations executadas com sucesso.';
            if ($request->wantsJson()) {
                return response()->json(['success' => true, 'message' => $msg, 'output' => self::toUtf8($output)]);
            }

            return redirect()->route('plataforma.settings.index', ['tab' => 'update'])->with('success', $msg);
        } catch (\Throwable $e) {
            $msg = self::withDockerManualHint('Falha ao rodar migrations: ' . self::toUtf8($e->getMessage()));
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'message' => $msg], 422);
            }

            return redirect()->route('plataforma.settings.index', ['tab' => 'update'])->with('error', $msg);
        }
    }

    /**
     * Run update: git pull, composer, npm build, migrate.
     */
    public function run(Request $request): JsonResponse|RedirectResponse
    {
        if (self::remoteUpdatesManaged()) {
            $message = 'Atualizações remotas não estão disponíveis. Use o fluxo de deploy habitual (Git / Docker).';
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'message' => $message, 'remote_managed' => true], 403);
            }

            return redirect()->back()->with('info', $message);
        }

        if (! config('platform.updates_enabled', true)) {
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'message' => 'Atualizações pela interface estão desativadas.'], 403);
            }

            return redirect()->route('plataforma.settings.index', ['tab' => 'update'])
                ->with('error', 'Atualizações pela interface estão desativadas.');
        }

        $action = $request->input('action');
        if ($request->wantsJson() && is_string($action) && $action !== '') {
            if ($action === 'integrity') {
                return $this->integrity();
            }
            if ($action === 'migrate') {
                return $this->migrateNow($request);
            }
        }

        $basePath = base_path();
        $branch = config('platform.update_branch', 'main');
        $expectedRepo = (string) config('platform.update_repository_url', '');
        $timeout = 300;
        $git = 'git -c safe.directory=' . escapeshellarg($basePath);

        // PHP executável (servidor web muitas vezes não tem PHP no PATH; usar caminho explícito ou PLATFORM_PHP_PATH)
        $phpBinary = null;
        if (defined('PHP_BINARY') && PHP_BINARY !== '') {
            $phpBinary = PHP_BINARY;
        } elseif (config('platform.php_path')) {
            $phpPath = rtrim(str_replace(['/', '\\'], DIRECTORY_SEPARATOR, config('platform.php_path')), DIRECTORY_SEPARATOR);
            $phpBinary = $phpPath . DIRECTORY_SEPARATOR . 'php.exe';
            if (! is_file($phpBinary)) {
                $phpBinary = $phpPath . DIRECTORY_SEPARATOR . 'php';
            }
        }
        $pathEnv = getenv('PATH') ?: '';
        if ($phpBinary !== null && $phpBinary !== '') {
            $phpDir = dirname($phpBinary);
            $pathEnv = $phpDir . PATH_SEPARATOR . $pathEnv;
        }
        $processEnv = ['PATH' => $pathEnv];
        $homeDir = getenv('HOME');
        if (! is_string($homeDir) || trim($homeDir) === '' || ! self::ensureWritableDir($homeDir)) {
            $homeDir = storage_path('app' . DIRECTORY_SEPARATOR . '.composer-home');
        }
        if (self::ensureWritableDir($homeDir)) {
            $processEnv['HOME'] = $homeDir;
            $processEnv['COMPOSER_HOME'] = $homeDir;
            $processEnv['COMPOSER_CACHE_DIR'] = $homeDir . DIRECTORY_SEPARATOR . 'cache';
            $processEnv['COMPOSER_ALLOW_SUPERUSER'] = '1';
        }

        $steps = [];
        $runStep = function (string $command, string $label) use ($basePath, $timeout, $processEnv, &$steps): bool {
            $result = Process::path($basePath)->timeout($timeout)->env($processEnv)->run($command);
            $steps[] = [
                'label' => $label,
                'ok' => $result->successful(),
                'output' => self::toUtf8($result->output()),
                'error' => self::toUtf8($result->errorOutput()),
            ];
            if (! $result->successful()) {
                return false;
            }
            return true;
        };

        $hasGitRepo = is_dir($basePath . DIRECTORY_SEPARATOR . '.git');

        if ($hasGitRepo && self::canRunProcess()) {
            $runStep($git . ' config user.email "platform-update@localhost" && ' . $git . ' config user.name "Plataforma Update"', 'Git config');
            $runStep($git . ' stash push -m "platform-update"', 'Git stash');

            if (! $runStep($git . " fetch origin && " . $git . " pull origin {$branch}", 'Git pull')) {
                $runStep($git . ' stash pop', 'Git stash pop');
                $last = end($steps);
                $msg = self::withDockerManualHint('Falha ao atualizar código: ' . self::toUtf8($last['error'] ?: $last['output'] ?: 'erro desconhecido'));
                if ($request->wantsJson()) {
                    return response()->json(['success' => false, 'message' => $msg, 'steps' => $steps], 422);
                }

                return redirect()->route('plataforma.settings.index', ['tab' => 'update'])->with('error', $msg);
            }

            $runStep($git . ' stash pop', 'Git stash pop');

            $composerCmd = 'composer install --no-interaction --no-dev';
            $vendorComposer = $basePath . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'composer';
            if ($phpBinary !== null && $phpBinary !== '' && is_file($phpBinary) && is_file($vendorComposer)) {
                $vendorComposerRelative = 'vendor' . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'composer';
                $composerCmd = '"' . $phpBinary . '" ' . $vendorComposerRelative . ' install --no-interaction --no-dev';
            }
            if (! $runStep($composerCmd, 'Composer install')) {
                $last = end($steps);
                $msg = self::withDockerManualHint('Falha no Composer: ' . self::toUtf8($last['error'] ?: $last['output'] ?: 'erro desconhecido'));
                if ($request->wantsJson()) {
                    return response()->json(['success' => false, 'message' => $msg, 'steps' => $steps], 422);
                }

                return redirect()->route('plataforma.settings.index', ['tab' => 'update'])->with('error', $msg);
            }

            $npmOk = true;
            $npmOutput = '';
            $npmError = '';
            $npmVersion = Process::path($basePath)->timeout(10)->env($processEnv)->run(self::isWindows() ? 'npm --version' : 'npm --version');
            if (! $npmVersion->successful()) {
                $npmOk = true;
                $npmOutput = 'npm não encontrado; pulando build.';
                $npmError = self::toUtf8($npmVersion->errorOutput());
                $steps[] = ['label' => 'NPM build', 'ok' => $npmOk, 'output' => $npmOutput, 'error' => $npmError];
            } else {
                if (! $runStep('npm ci && npm run build', 'NPM build')) {
                    $last = end($steps);
                    $msg = self::withDockerManualHint('Falha no build do frontend: ' . self::toUtf8($last['error'] ?: $last['output'] ?: 'erro desconhecido'));
                    if ($request->wantsJson()) {
                        return response()->json(['success' => false, 'message' => $msg, 'steps' => $steps], 422);
                    }

                    return redirect()->route('plataforma.settings.index', ['tab' => 'update'])->with('error', $msg);
                }
            }

            $cleanup = self::cleanupViteHotFiles();
            $steps[] = [
                'label' => 'Limpeza Vite hot',
                'ok' => empty($cleanup['errors']),
                'output' => ! empty($cleanup['deleted']) ? implode("\n", $cleanup['deleted']) : '',
                'error' => ! empty($cleanup['errors']) ? implode("\n", $cleanup['errors']) : '',
            ];
        } else {
            $archive = $this->runArchiveUpdate($basePath, $branch);
            $steps[] = [
                'label' => 'Atualização por download',
                'ok' => (bool) ($archive['ok'] ?? false),
                'output' => self::toUtf8((string) ($archive['message'] ?? '')),
                'error' => self::toUtf8((string) (! empty($archive['details']['errors']) ? implode("\n", (array) $archive['details']['errors']) : '')),
            ];

            if (! ($archive['ok'] ?? false)) {
                $msg = self::withDockerManualHint((string) ($archive['message'] ?? 'Falha ao atualizar.'));
                if ($request->wantsJson()) {
                    return response()->json(['success' => false, 'message' => $msg, 'steps' => $steps], 422);
                }
                return redirect()->route('plataforma.settings.index', ['tab' => 'update'])->with('error', $msg);
            }

            $cleanup = self::cleanupViteHotFiles();
            $steps[] = [
                'label' => 'Limpeza Vite hot',
                'ok' => empty($cleanup['errors']),
                'output' => ! empty($cleanup['deleted']) ? implode("\n", $cleanup['deleted']) : '',
                'error' => ! empty($cleanup['errors']) ? implode("\n", $cleanup['errors']) : '',
            ];
        }

        // 4. Migrate
        try {
            \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        } catch (\Throwable $e) {
            $msg = self::withDockerManualHint('Falha nas migrations: ' . self::toUtf8($e->getMessage()));
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'message' => $msg, 'steps' => $steps], 422);
            }

            return redirect()->route('plataforma.settings.index', ['tab' => 'update'])->with('error', $msg);
        }

        // 4b. Re-sincroniza plugins do disco com o banco (não desinstala).
        try {
            \Illuminate\Support\Facades\Artisan::call('plugins:ensure-installed');
            $steps[] = [
                'label' => 'Plugins (ensure-installed)',
                'ok' => true,
                'output' => self::toUtf8((string) \Illuminate\Support\Facades\Artisan::output()),
                'error' => '',
            ];
        } catch (\Throwable $e) {
            $steps[] = [
                'label' => 'Plugins (ensure-installed)',
                'ok' => false,
                'output' => '',
                'error' => self::toUtf8($e->getMessage()),
            ];
        }

        // 5. Config cache
        try {
            \Illuminate\Support\Facades\Artisan::call('config:cache');
        } catch (\Throwable $e) {
            // Non-fatal
        }

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Atualização concluída com sucesso.', 'redirect' => route('plataforma.settings.index', ['tab' => 'update']), 'steps' => $steps]);
        }

        return redirect()->route('plataforma.settings.index', ['tab' => 'update'])->with('success', 'Atualização concluída com sucesso.');
    }
}
