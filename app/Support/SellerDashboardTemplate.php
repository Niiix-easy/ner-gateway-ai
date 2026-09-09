<?php

namespace App\Support;

class SellerDashboardTemplate
{
    public const KEY = 'seller_dashboard_template';

    public const AURORA = 'aurora';

    /**
     * @deprecated Mantido só por compatibilidade; o painel usa sempre Aurora.
     */
    public const DEFAULT = self::AURORA;

    /**
     * @deprecated Mantido só por compatibilidade; o painel usa sempre Aurora.
     */
    public const KAWAII = 'kawaii';

    /**
     * @return list<string>
     */
    public static function allowed(): array
    {
        return [self::AURORA];
    }

    public static function resolve(?string $raw = null): string
    {
        return self::AURORA;
    }

    public static function current(): string
    {
        return self::AURORA;
    }
}
