<?php

namespace App\Support;

use Illuminate\Support\Facades\Route;

final class GatewayWebhookUrl
{
    public static function forGateway(string $gatewaySlug): string
    {
        $path = self::pathForGateway($gatewaySlug);
        $base = self::resolvePublicBase();

        if ($base !== null) {
            return rtrim($base, '/').$path;
        }

        $routeName = 'webhooks.'.$gatewaySlug;
        if (Route::has($routeName)) {
            return route($routeName);
        }

        return url($path);
    }

    public static function pathForGateway(string $gatewaySlug): string
    {
        return match ($gatewaySlug) {
            'efi' => '/webhooks/gateways/efi/pix',
            'spacepag' => '/webhooks/gateways/spacepag',
            default => '/webhooks/gateways/'.$gatewaySlug,
        };
    }

    /**
     * Prefere PLATFORM_WEBHOOK_PUBLIC_URL, depois APP_URL — mas ignora bases locais/dev
     * (ex.: http://platform-gateway.test) para não expor URL inválida em produção.
     */
    public static function resolvePublicBase(): ?string
    {
        $candidates = [
            trim((string) (config('platform.webhook_public_url') ?? '')),
            trim((string) config('app.url', '')),
        ];

        foreach ($candidates as $candidate) {
            if ($candidate !== '' && self::isUsablePublicBase($candidate)) {
                return rtrim($candidate, '/');
            }
        }

        return null;
    }

    public static function isUsablePublicBase(string $base): bool
    {
        $base = trim($base);
        if ($base === '' || filter_var($base, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $scheme = strtolower((string) parse_url($base, PHP_URL_SCHEME));
        if (! in_array($scheme, ['http', 'https'], true)) {
            return false;
        }

        $host = strtolower((string) (parse_url($base, PHP_URL_HOST) ?: ''));
        if ($host === '' || $host === 'localhost' || str_ends_with($host, '.localhost')) {
            return false;
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return false;
        }

        foreach (['.test', '.local', '.invalid', '.example', '.lan', '.home'] as $tld) {
            if (str_ends_with($host, $tld)) {
                return false;
            }
        }

        return str_contains($host, '.');
    }
}
