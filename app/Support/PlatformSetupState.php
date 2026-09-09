<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Schema;

/**
 * Estado da primeira configuração da plataforma (build white label).
 *
 * Depois de criar o primeiro administrador, o operador é levado a
 * /plataforma/primeiros-passos para dar nome, cor e identidade à plataforma
 * antes de qualquer outra coisa. Enquanto isso não for concluído, o painel
 * redireciona para lá.
 */
final class PlatformSetupState
{
    public const SETTING_KEY = 'platform_setup_completed';

    public const ROUTE_PATH = 'plataforma/primeiros-passos';

    public static function isCompleted(): bool
    {
        try {
            if (! Schema::hasTable('settings')) {
                return true;
            }
        } catch (\Throwable) {
            // Banco indisponível/parcial: não bloqueia o painel.
            return true;
        }

        return filter_var(Setting::get(self::SETTING_KEY, false, null), FILTER_VALIDATE_BOOLEAN);
    }

    public static function markCompleted(): void
    {
        Setting::set(self::SETTING_KEY, true, null);
    }

    public static function reset(): void
    {
        Setting::set(self::SETTING_KEY, false, null);
    }
}
