<?php

namespace App\Services\Payout;

use App\Gateways\GatewayRegistry;
use App\Models\GatewayCredential;
use App\Models\Setting;
use App\Services\CajuPay\CajuPayAccountResolver;

/**
 * Provedor de payout da plataforma (saque automático PIX).
 *
 * Gateways com API de cashout: CajuPay, Woovi, OnlyUp, Pluggou, BlackCat, UmbrellaPag e Pay Shark (plugins).
 * Preferência configurável em {@see Setting} `platform_payout_gateway`
 * (`auto`, `cajupay`, `woovi`, `onlyup`, `pluggou`, `blackcat`, `umbrellapag`, `payshark`).
 * Em `auto`, a ordem fixa é CajuPay → Woovi → OnlyUp → Pluggou → BlackCat → UmbrellaPag → Pay Shark — o primeiro globalmente conectado vence.
 * Plugins só entram se estiverem registrados no {@see GatewayRegistry}.
 */
class PlatformPayoutGateway
{
    /** @var list<string> */
    public const PAYOUT_ORDER = ['cajupay', 'woovi', 'onlyup', 'pluggou', 'blackcat', 'umbrellapag', 'payshark'];

    /**
     * Preferência salva no painel: automático ou forçar um dos gateways.
     *
     * @return 'auto'|'cajupay'|'woovi'|'onlyup'|'pluggou'|'blackcat'|'umbrellapag'|'payshark'
     */
    public static function preference(): string
    {
        $v = Setting::get('platform_payout_gateway', null, null);
        if (in_array($v, ['cajupay', 'woovi', 'onlyup', 'pluggou', 'blackcat', 'umbrellapag', 'payshark'], true)) {
            return $v;
        }

        return 'auto';
    }

    public static function activeSlug(): ?string
    {
        $connected = [];
        foreach (self::PAYOUT_ORDER as $slug) {
            if (in_array($slug, ['pluggou', 'blackcat', 'umbrellapag', 'payshark'], true) && GatewayRegistry::get($slug) === null) {
                continue;
            }
            if ($slug === 'cajupay') {
                if (app(CajuPayAccountResolver::class)->anyConnectedForPayout()) {
                    $connected[$slug] = true;
                }
                continue;
            }
            $cred = GatewayCredential::resolveForPayment(null, $slug);
            if ($cred !== null && $cred->is_connected) {
                $connected[$slug] = true;
            }
        }

        if ($connected === []) {
            return null;
        }

        $pref = self::preference();

        if ($pref !== 'auto' && isset($connected[$pref])) {
            return $pref;
        }

        foreach (self::PAYOUT_ORDER as $slug) {
            if (isset($connected[$slug])) {
                return $slug;
            }
        }

        return null;
    }

    public static function isEnabled(): bool
    {
        return self::activeSlug() !== null;
    }
}
