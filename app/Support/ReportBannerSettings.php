<?php

namespace App\Support;

use App\Models\Setting;
use App\Services\StorageService;

/**
 * Banners do topo da tela de Relatórios.
 *
 * Mesmo formato do [[DashboardBannerSettings]] (uma linha em `settings`, sem
 * tabela nova), com um campo a mais: `href`. Na referência o banner é peça
 * de parceiro e leva para fora, então sem link ele não serve para nada.
 */
final class ReportBannerSettings
{
    public const KEY = 'report_banners';

    /**
     * @return array<int, array{id:string,title:string,href:string,desktop_url:string,mobile_url:string,active:bool,sort_order:int}>
     */
    public static function banners(bool $activeOnly = false, bool $resolveUrls = true): array
    {
        $raw = Setting::get(self::KEY, [], null);
        $rows = is_string($raw) ? json_decode($raw, true) : $raw;
        if (! is_array($rows)) {
            return [];
        }

        $storage = $resolveUrls ? app(StorageService::class) : null;

        $items = collect($rows)
            ->filter(fn ($item) => is_array($item))
            ->map(function (array $item, int $idx) use ($storage, $resolveUrls) {
                $desktop = (string) ($item['desktop_url'] ?? '');
                $mobile = (string) ($item['mobile_url'] ?? '');

                if ($resolveUrls && $storage !== null) {
                    $desktop = $desktop !== '' ? $storage->resolvePublicUrl($desktop) : '';
                    $mobile = $mobile !== '' ? $storage->resolvePublicUrl($mobile) : '';
                }

                return [
                    'id' => (string) ($item['id'] ?? ('report-banner-'.$idx)),
                    'title' => (string) ($item['title'] ?? ''),
                    'href' => self::safeHref($item['href'] ?? ''),
                    'desktop_url' => $desktop,
                    'mobile_url' => $mobile,
                    'active' => (bool) ($item['active'] ?? true),
                    'sort_order' => (int) ($item['sort_order'] ?? ($idx + 1)),
                ];
            })
            ->sortBy('sort_order')
            ->values();

        if ($activeOnly) {
            $items = $items->filter(
                fn (array $item) => $item['active'] && ($item['desktop_url'] !== '' || $item['mobile_url'] !== '')
            );
        }

        return $items->values()->all();
    }

    /**
     * Só http(s) sai daqui. O destino é digitado no painel e vira `href` de um
     * link que o vendedor clica — `javascript:` ou `data:` ali seria XSS.
     */
    public static function safeHref(mixed $value): string
    {
        $href = is_string($value) ? trim($value) : '';
        if ($href === '') {
            return '';
        }

        $scheme = strtolower((string) (parse_url($href, PHP_URL_SCHEME) ?: ''));

        return in_array($scheme, ['http', 'https'], true) ? $href : '';
    }
}
