<?php

namespace App\Http\Middleware;

use App\Models\BrandingSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use App\Support\BrandingAssetUrls;
use Symfony\Component\HttpFoundation\Response;

class ApplyBrandingConfig
{
    private const CONFIG_KEYS = [
        'app_name' => 'platform.app_name',
        'theme_primary' => 'platform.theme_primary',
        'pwa_theme_color' => 'platform.pwa_theme_color',
        'app_logo' => 'platform.app_logo',
        'app_logo_dark' => 'platform.app_logo_dark',
        'app_logo_icon' => 'platform.app_logo_icon',
        'app_logo_icon_dark' => 'platform.app_logo_icon_dark',
        'pwa_nav_logo' => 'platform.pwa_nav_logo',
        'pwa_nav_logo_dark' => 'platform.pwa_nav_logo_dark',
        'login_hero_image' => 'platform.login_hero_image',
        'login_hero_tagline' => 'platform.login_hero_tagline',
        'login_hero_subtagline' => 'platform.login_hero_subtagline',
        'favicon_url' => 'platform.favicon_url',
        'pwa_icon_192' => 'platform.pwa_icon_192',
        'pwa_icon_512' => 'platform.pwa_icon_512',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('plataforma/configuracoes/storage/*')) {
            return $next($request);
        }

        $hasBrandingTable = false;
        try {
            $hasBrandingTable = Schema::hasTable('branding_settings');
        } catch (\Throwable) {
            $hasBrandingTable = false;
        }

        if ($hasBrandingTable) {
            $data = $this->effectiveData($request);
            $merge = [];
            foreach (self::CONFIG_KEYS as $jsonKey => $configKey) {
                $v = $data[$jsonKey] ?? null;
                if (is_string($v) && $v !== '') {
                    if (in_array($jsonKey, BrandingAssetUrls::IMAGE_KEYS, true)) {
                        $v = BrandingAssetUrls::resolve($v);
                    }
                    $merge[$configKey] = $v;
                }
            }
            if ($merge !== []) {
                config($merge);
            }

            try {
                \App\Support\PanelPushSettings::applyToConfig();
            } catch (\Throwable) {
                // ignore during install / partial schema
            }
        }

        try {
            \App\Support\PanelColorScheme::applyToConfig();
        } catch (\Throwable) {
            // ignore during install / partial schema
        }

        return $next($request);
    }

    public static function mergeLayers(array $global, array $tenant): array
    {
        $keys = array_unique(array_merge(array_keys($global), array_keys($tenant)));
        $out = [];
        foreach ($keys as $k) {
            $v = $tenant[$k] ?? null;
            if (is_string($v) && $v !== '') {
                $out[$k] = $v;
            } elseif (isset($global[$k]) && is_string($global[$k]) && $global[$k] !== '') {
                $out[$k] = $global[$k];
            }
        }

        return $out;
    }

    private function effectiveData(Request $request): array
    {
        $global = BrandingSetting::query()->whereNull('tenant_id')->first();
        $globalData = is_array($global?->data) ? $global->data : [];
        $user = $request->user();
        if ($user === null) {
            return $globalData;
        }

        $tenant = BrandingSetting::query()->where('tenant_id', $user->tenant_id)->first();
        $tenantData = is_array($tenant?->data) ? $tenant->data : [];

        return self::mergeLayers($globalData, $tenantData);
    }
}
