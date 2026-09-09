<?php

namespace App\Support;

/**
 * Medidas dos banners da tela de Relatórios.
 *
 * O desktop segue a proporção 3:1 da referência (o carrossel do topo do
 * relatório); o mobile abre um pouco (2,4:1) porque uma faixa 3:1 numa coluna
 * de ~340px vira um filete de 113px de altura e a arte não se lê.
 *
 * As medidas são exatas e validadas nos dois lados (navegador e servidor):
 * banner é peça de arte, e recorte automático estragaria a composição.
 */
final class ReportBannerSpecs
{
    public const VARIANT_DESKTOP = 'desktop';

    public const VARIANT_MOBILE = 'mobile';

    /** @var array{width:int,height:int} 3:1 */
    public const DESKTOP = ['width' => 1800, 'height' => 600];

    /** @var array{width:int,height:int} 2,4:1 */
    public const MOBILE = ['width' => 1200, 'height' => 500];

    /**
     * @return array{width:int,height:int}
     */
    public static function dimensionsFor(string $variant): array
    {
        return match ($variant) {
            self::VARIANT_MOBILE => self::MOBILE,
            default => self::DESKTOP,
        };
    }

    public static function labelFor(string $variant): string
    {
        $dims = self::dimensionsFor($variant);

        return $dims['width'].'×'.$dims['height'].' px';
    }

    public static function ratioFor(string $variant): string
    {
        return $variant === self::VARIANT_MOBILE ? '2,4:1' : '3:1';
    }

    public static function validateSize(int $width, int $height, string $variant): bool
    {
        $expected = self::dimensionsFor($variant);

        return $width === $expected['width'] && $height === $expected['height'];
    }

    public static function mismatchMessage(int $width, int $height, string $variant): string
    {
        $label = self::labelFor($variant);
        $name = $variant === self::VARIANT_MOBILE ? 'mobile' : 'desktop';

        return "A imagem {$name} deve ter exatamente {$label} (recebido: {$width}×{$height}).";
    }

    /**
     * @return array<string, array{width:int,height:int,label:string,ratio:string}>
     */
    public static function toFrontendSpecs(): array
    {
        return [
            self::VARIANT_DESKTOP => [
                'width' => self::DESKTOP['width'],
                'height' => self::DESKTOP['height'],
                'label' => self::labelFor(self::VARIANT_DESKTOP),
                'ratio' => self::ratioFor(self::VARIANT_DESKTOP),
            ],
            self::VARIANT_MOBILE => [
                'width' => self::MOBILE['width'],
                'height' => self::MOBILE['height'],
                'label' => self::labelFor(self::VARIANT_MOBILE),
                'ratio' => self::ratioFor(self::VARIANT_MOBILE),
            ],
        ];
    }
}
