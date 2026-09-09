<?php

namespace Tests\Concerns;

use App\Models\Plugin;
use App\Plugins\PluginFeatureCatalog;
use Illuminate\Support\Facades\Schema;

trait ActivatesFeaturePlugins
{
    /**
     * Activate a feature plugin for the current test (DB + capability registration).
     */
    protected function activateFeaturePlugin(string $slug): void
    {
        PluginFeatureCatalog::register($slug, PluginFeatureCatalog::expectedToken($slug));

        if (! Schema::hasTable('plugins')) {
            return;
        }

        Plugin::query()->updateOrCreate(
            ['slug' => $slug],
            [
                'name' => $slug,
                'version' => '1.0.0',
                'is_enabled' => true,
                'config' => null,
            ]
        );
    }

    protected function activateAllFeaturePlugins(): void
    {
        foreach (PluginFeatureCatalog::KNOWN_FEATURES as $slug) {
            $this->activateFeaturePlugin($slug);
        }
    }

    protected function deactivateFeaturePlugin(string $slug): void
    {
        if (Schema::hasTable('plugins')) {
            Plugin::query()->where('slug', $slug)->update(['is_enabled' => false]);
        }
        // Re-register others remain; drop this slug by resetting and re-activating remaining.
        $stillActive = [];
        foreach (PluginFeatureCatalog::KNOWN_FEATURES as $known) {
            if ($known === $slug) {
                continue;
            }
            if (PluginFeatureCatalog::active($known) || (
                Schema::hasTable('plugins')
                && Plugin::query()->where('slug', $known)->where('is_enabled', true)->exists()
                && PluginFeatureCatalog::isRegistered($known)
            )) {
                $stillActive[] = $known;
            }
        }
        PluginFeatureCatalog::reset();
        foreach ($stillActive as $known) {
            if (Schema::hasTable('plugins') && Plugin::query()->where('slug', $known)->where('is_enabled', true)->exists()) {
                PluginFeatureCatalog::register($known, PluginFeatureCatalog::expectedToken($known));
            }
        }
    }

    protected function deactivateAllFeaturePlugins(): void
    {
        PluginFeatureCatalog::reset();
        if (Schema::hasTable('plugins')) {
            Plugin::query()
                ->whereIn('slug', PluginFeatureCatalog::KNOWN_FEATURES)
                ->update(['is_enabled' => false]);
        }
    }
}
