<?php

namespace Tests\Unit;

use App\Models\GatewayCredential;
use App\Models\Setting;
use App\Services\Payout\PlatformPayoutGateway;
use Tests\TestCase;

class PlatformPayoutGatewayTest extends TestCase
{
    public function test_cajupay_wins_when_both_connected(): void
    {
        foreach (['cajupay', 'spacepag'] as $slug) {
            $cred = GatewayCredential::query()->firstOrNew([
                'tenant_id' => null,
                'gateway_slug' => $slug,
            ]);
            $cred->is_connected = true;
            $cred->setEncryptedCredentials([
                'public_key' => 'pk_'.$slug,
                'secret_key' => 'sk_'.$slug,
            ]);
            $cred->save();
        }

        $this->assertSame('cajupay', PlatformPayoutGateway::activeSlug());

        GatewayCredential::query()->where('gateway_slug', 'cajupay')->delete();

        $this->assertSame('spacepag', PlatformPayoutGateway::activeSlug());

        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'spacepag'])->delete();
    }

    public function test_preference_spacepag_overrides_order_when_both_connected(): void
    {
        Setting::set('platform_payout_gateway', 'spacepag', null);

        foreach (['cajupay', 'spacepag'] as $slug) {
            $cred = GatewayCredential::query()->firstOrNew([
                'tenant_id' => null,
                'gateway_slug' => $slug,
            ]);
            $cred->is_connected = true;
            $cred->setEncryptedCredentials([
                'public_key' => 'pk_'.$slug,
                'secret_key' => 'sk_'.$slug,
            ]);
            $cred->save();
        }

        $this->assertSame('spacepag', PlatformPayoutGateway::activeSlug());
        $this->assertSame('spacepag', PlatformPayoutGateway::preference());

        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'spacepag'])->delete();
        Setting::set('platform_payout_gateway', null, null);
    }

    public function test_woovi_wins_when_only_woovi_connected(): void
    {
        $cred = GatewayCredential::query()->firstOrNew([
            'tenant_id' => null,
            'gateway_slug' => 'woovi',
        ]);
        $cred->is_connected = true;
        $cred->setEncryptedCredentials([
            'app_id' => 'app',
            'from_pix_key' => 'pix@test.com',
        ]);
        $cred->save();

        $this->assertSame('woovi', PlatformPayoutGateway::activeSlug());

        GatewayCredential::query()->where('gateway_slug', 'woovi')->delete();
    }

    public function test_preference_woovi_overrides_order_when_all_three_connected(): void
    {
        Setting::set('platform_payout_gateway', 'woovi', null);

        foreach (['cajupay', 'spacepag', 'woovi'] as $slug) {
            $cred = GatewayCredential::query()->firstOrNew([
                'tenant_id' => null,
                'gateway_slug' => $slug,
            ]);
            $cred->is_connected = true;
            if ($slug === 'woovi') {
                $cred->setEncryptedCredentials([
                    'app_id' => 'app',
                    'from_pix_key' => 'pix@test.com',
                ]);
            } else {
                $cred->setEncryptedCredentials([
                    'public_key' => 'pk_'.$slug,
                    'secret_key' => 'sk_'.$slug,
                ]);
            }
            $cred->save();
        }

        $this->assertSame('woovi', PlatformPayoutGateway::activeSlug());
        $this->assertSame('woovi', PlatformPayoutGateway::preference());

        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'spacepag', 'woovi'])->delete();
        Setting::set('platform_payout_gateway', null, null);
    }

    public function test_onlyup_active_when_only_onlyup_connected(): void
    {
        Setting::set('platform_payout_gateway', null, null);

        $cred = GatewayCredential::query()->firstOrNew([
            'tenant_id' => null,
            'gateway_slug' => 'onlyup',
        ]);
        $cred->is_connected = true;
        $cred->setEncryptedCredentials([
            'pix_key' => 'test@example.com',
            'cashin_client_id' => 'id',
            'cashin_client_secret' => 'secret',
        ]);
        $cred->save();

        $this->assertSame('onlyup', PlatformPayoutGateway::activeSlug());

        GatewayCredential::query()->where('gateway_slug', 'onlyup')->delete();
    }

    public function test_preference_onlyup_overrides_order_when_all_connected(): void
    {
        Setting::set('platform_payout_gateway', 'onlyup', null);

        foreach (['cajupay', 'spacepag', 'woovi', 'onlyup'] as $slug) {
            $cred = GatewayCredential::query()->firstOrNew([
                'tenant_id' => null,
                'gateway_slug' => $slug,
            ]);
            $cred->is_connected = true;
            if ($slug === 'onlyup') {
                $cred->setEncryptedCredentials([
                    'pix_key' => 'test@example.com',
                    'cashin_client_id' => 'id',
                    'cashin_client_secret' => 'secret',
                ]);
            } elseif ($slug === 'woovi') {
                $cred->setEncryptedCredentials([
                    'app_id' => 'app',
                    'from_pix_key' => 'pix@test.com',
                ]);
            } else {
                $cred->setEncryptedCredentials([
                    'public_key' => 'pk_'.$slug,
                    'secret_key' => 'sk_'.$slug,
                ]);
            }
            $cred->save();
        }

        $this->assertSame('onlyup', PlatformPayoutGateway::activeSlug());
        $this->assertSame('onlyup', PlatformPayoutGateway::preference());

        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'spacepag', 'woovi', 'onlyup'])->delete();
        Setting::set('platform_payout_gateway', null, null);
    }

    public function test_pluggou_active_when_registered_and_connected(): void
    {
        Setting::set('platform_payout_gateway', null, null);

        \App\Gateways\GatewayRegistry::register([
            'slug' => 'pluggou',
            'name' => 'Pluggou',
            'methods' => ['pix'],
            'driver' => \Plugins\Pluggou\PluggouDriver::class,
            'credential_keys' => [],
        ]);

        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'woovi', 'onlyup'])->delete();

        $cred = GatewayCredential::query()->firstOrNew([
            'tenant_id' => null,
            'gateway_slug' => 'pluggou',
        ]);
        $cred->is_connected = true;
        $cred->setEncryptedCredentials([
            'public_key' => 'pk',
            'secret_key' => 'sk',
            'webhook_code' => 'code',
        ]);
        $cred->save();

        $this->assertSame('pluggou', PlatformPayoutGateway::activeSlug());

        GatewayCredential::query()->where('gateway_slug', 'pluggou')->delete();
    }

    public function test_pluggou_ignored_when_plugin_not_registered(): void
    {
        Setting::set('platform_payout_gateway', 'pluggou', null);

        \App\Gateways\GatewayRegistry::unregister('pluggou');

        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'woovi', 'onlyup', 'pluggou'])->delete();

        $cred = GatewayCredential::query()->firstOrNew([
            'tenant_id' => null,
            'gateway_slug' => 'pluggou',
        ]);
        $cred->is_connected = true;
        $cred->setEncryptedCredentials([
            'public_key' => 'pk',
            'secret_key' => 'sk',
        ]);
        $cred->save();

        // Preferência pluggou sem registro no GatewayRegistry → sem provedor ativo.
        $this->assertNull(PlatformPayoutGateway::activeSlug());

        GatewayCredential::query()->where('gateway_slug', 'pluggou')->delete();
        Setting::set('platform_payout_gateway', null, null);
    }

    public function test_blackcat_active_when_registered_and_connected(): void
    {
        Setting::set('platform_payout_gateway', null, null);

        \App\Gateways\GatewayRegistry::register([
            'slug' => 'blackcat',
            'name' => 'BlackCat',
            'methods' => ['pix'],
            'driver' => \Plugins\Blackcat\BlackcatDriver::class,
            'credential_keys' => [],
        ]);

        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'woovi', 'onlyup', 'pluggou'])->delete();

        $cred = GatewayCredential::query()->firstOrNew([
            'tenant_id' => null,
            'gateway_slug' => 'blackcat',
        ]);
        $cred->is_connected = true;
        $cred->setEncryptedCredentials([
            'api_key' => 'key',
            'webhook_token' => 'tok',
        ]);
        $cred->save();

        $this->assertSame('blackcat', PlatformPayoutGateway::activeSlug());

        GatewayCredential::query()->where('gateway_slug', 'blackcat')->delete();
    }

    public function test_blackcat_ignored_when_plugin_not_registered(): void
    {
        Setting::set('platform_payout_gateway', 'blackcat', null);

        \App\Gateways\GatewayRegistry::unregister('blackcat');

        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'woovi', 'onlyup', 'pluggou', 'blackcat'])->delete();

        $cred = GatewayCredential::query()->firstOrNew([
            'tenant_id' => null,
            'gateway_slug' => 'blackcat',
        ]);
        $cred->is_connected = true;
        $cred->setEncryptedCredentials([
            'api_key' => 'key',
        ]);
        $cred->save();

        $this->assertNull(PlatformPayoutGateway::activeSlug());

        GatewayCredential::query()->where('gateway_slug', 'blackcat')->delete();
        Setting::set('platform_payout_gateway', null, null);
    }
}
