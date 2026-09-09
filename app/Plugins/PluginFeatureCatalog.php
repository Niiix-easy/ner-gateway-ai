<?php

namespace App\Plugins;

/**
 * Runtime catalog of feature capabilities registered by feature-plugins at boot.
 *
 * A feature is "active" when it is explicitly enabled as a built-in resource,
 * or when all of the following plugin conditions hold:
 * 1. Plugin folder exists with a valid plugin.json
 * 2. plugins.is_enabled = true in the database
 * 3. The plugin bootstrap registered a valid capability token in this catalog
 *
 * Flipping the DB flag without the Capability.php class does not unlock features.
 */
class PluginFeatureCatalog
{
    public const FEATURE_INFOPRODUTOS = 'infoprodutos';

    public const FEATURE_VITRINE_AFILIADOS = 'vitrine-afiliados';

    public const FEATURE_EQUIPE = 'equipe';

    /** @var list<string> */
    public const KNOWN_FEATURES = [
        self::FEATURE_INFOPRODUTOS,
        self::FEATURE_VITRINE_AFILIADOS,
        self::FEATURE_EQUIPE,
    ];

    /** @var array<string, string> slug => token */
    private static array $registered = [];

    public static function reset(): void
    {
        self::$registered = [];
    }

    /**
     * Called from plugin bootstrap.php via Capability::register().
     */
    public static function register(string $slug, string $token): void
    {
        $slug = trim($slug);
        $token = trim($token);
        if ($slug === '' || $token === '') {
            return;
        }
        if (! in_array($slug, self::KNOWN_FEATURES, true)) {
            return;
        }
        if (! self::tokenMatches($slug, $token)) {
            return;
        }
        self::$registered[$slug] = $token;
    }

    public static function isRegistered(string $slug): bool
    {
        return isset(self::$registered[$slug]);
    }

    /**
     * Build white label: todos os recursos vêm liberados no código-base.
     *
     * Não há loja de plugins, chave de ativação nem gate de licença — qualquer
     * feature conhecida é sempre considerada ativa.
     */
    public static function active(string $slug): bool
    {
        $slug = trim($slug);

        return $slug !== '' && in_array($slug, self::KNOWN_FEATURES, true);
    }

    /**
     * Public map for Inertia (and similar). Keys use underscore for JS convenience.
     *
     * @return array{infoprodutos: bool, vitrine_afiliados: bool, equipe: bool}
     */
    public static function shareMap(): array
    {
        return [
            'infoprodutos' => self::active(self::FEATURE_INFOPRODUTOS),
            'vitrine_afiliados' => self::active(self::FEATURE_VITRINE_AFILIADOS),
            'equipe' => self::active(self::FEATURE_EQUIPE),
        ];
    }

    /**
     * Expected capability token for a feature slug.
     * Must match what each plugin's Capability::token() produces.
     */
    public static function expectedToken(string $slug): string
    {
        return hash_hmac('sha256', 'platform.feature.'.$slug, self::signingKey());
    }

    public static function tokenMatches(string $slug, string $token): bool
    {
        $expected = self::expectedToken($slug);

        return hash_equals($expected, $token);
    }

    private static function signingKey(): string
    {
        // Stable app-agnostic salt so Capability.php can compute the same token offline.
        // Not APP_KEY — plugins ship as ZIPs and must work across installs.
        return 'platform-feature-plugin-v1';
    }

    private static function isEnabledInDatabase(string $slug): bool
    {
        try {
            if (! \Illuminate\Support\Facades\Schema::hasTable('plugins')) {
                return false;
            }
            $row = \App\Models\Plugin::query()->where('slug', $slug)->first();

            return $row !== null && (bool) $row->is_enabled;
        } catch (\Throwable) {
            return false;
        }
    }

    private static function isInstalledOnDisk(string $slug): bool
    {
        $path = PluginRegistry::pluginsPath().DIRECTORY_SEPARATOR.$slug;
        $manifest = PluginRegistry::readManifest($path);
        if (! is_array($manifest)) {
            return false;
        }
        $capability = $path.DIRECTORY_SEPARATOR.'src'.DIRECTORY_SEPARATOR.'Capability.php';

        return is_file($capability);
    }
}
