<?php

namespace App\Support;

class LoginTemplate
{
    public const KEY = 'login_template';

    public const IMMERSIVE = 'immersive';

    /**
     * @deprecated Mantido só por compatibilidade; o login usa sempre Imersivo.
     */
    public const DEFAULT = self::IMMERSIVE;

    /**
     * @deprecated Mantido só por compatibilidade; o login usa sempre Imersivo.
     */
    public const SPOTLIGHT = 'spotlight';

    /**
     * @return list<string>
     */
    public static function allowed(): array
    {
        return [self::IMMERSIVE];
    }

    public static function resolve(?string $raw = null): string
    {
        return self::IMMERSIVE;
    }

    public static function current(): string
    {
        return self::IMMERSIVE;
    }
}
