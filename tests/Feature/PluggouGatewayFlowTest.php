<?php

namespace Tests\Feature;

use App\Gateways\GatewayRegistry;
use App\Models\GatewayCredential;
use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\Withdrawal;
use App\Services\Payout\PlatformPayoutGateway;
use App\Services\WithdrawalAutoPayoutService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Plugins\Pluggou\PluggouDriver;
use Plugins\Pluggou\PluggouWebhookHandler;
use Tests\TestCase;

class PluggouGatewayFlowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        GatewayRegistry::register([
            'slug' => 'pluggou',
            'name' => 'Pluggou',
            'methods' => ['pix'],
            'driver' => PluggouDriver::class,
            'webhook_handler' => PluggouWebhookHandler::class,
            'credential_keys' => [],
        ]);
    }

    public function test_webhook_rejects_invalid_code(): void
    {
        $this->seedPluggouCredentials('whsec-correct');

        $response = $this->postJson('/webhooks/gateways/pluggou', [
            'event_type' => 'transaction',
            'data' => ['id' => 'tx-1', 'status' => 'paid'],
        ], [
            'X-Webhook-Code' => 'wrong',
        ]);

        $response->assertStatus(401);
    }

    public function test_transaction_webhook_reconfirms_and_pays_order(): void
    {
        $this->seedPluggouCredentials('whsec-ok');

        Http::fake([
            'https://api.pluggoutech.com/api/transactions/*' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'plg-tx-1',
                    'status' => 'paid',
                    'amount' => 1000,
                ],
            ], 200),
        ]);

        $user = User::factory()->create(['tenant_id' => 1]);
        $product = $this->createTestProduct(['tenant_id' => 1]);

        $order = Order::create([
            'tenant_id' => 1,
            'user_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'pending',
            'amount' => 10,
            'email' => 'buyer@test.com',
            'gateway' => 'pluggou',
            'gateway_id' => 'plg-tx-1',
        ]);

        $response = $this->postJson('/webhooks/gateways/pluggou', [
            'id' => 'evt-1',
            'event_type' => 'transaction',
            'data' => [
                'id' => 'plg-tx-1',
                'status' => 'paid',
                'amount' => 1000,
            ],
        ], [
            'X-Webhook-Code' => 'whsec-ok',
            'X-Webhook-Event-ID' => 'evt-1',
        ]);

        $response->assertOk();
        $this->assertSame('completed', $order->fresh()->status);
    }

    public function test_withdrawal_webhook_marks_paid(): void
    {
        if (! Schema::hasTable('withdrawals')) {
            $this->markTestSkipped('withdrawals table');
        }

        $this->seedPluggouCredentials('whsec-ok');

        Http::fake([
            'https://api.pluggoutech.com/api/withdrawals/*' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'wd-plg-1',
                    'status' => 'paid',
                ],
            ], 200),
        ]);

        $seller = User::factory()->create(['role' => User::ROLE_INFOPRODUTOR]);
        $seller->forceFill(['tenant_id' => $seller->id])->save();

        $withdrawal = Withdrawal::query()->create([
            'tenant_id' => $seller->id,
            'user_id' => $seller->id,
            'amount' => 50,
            'fee_amount' => 0,
            'net_amount' => 50,
            'bucket' => 'pix',
            'status' => 'pending',
            'currency' => 'BRL',
            'payout_provider' => 'pluggou',
            'payout_external_id' => 'wd-plg-1',
        ]);

        $response = $this->postJson('/webhooks/gateways/pluggou', [
            'id' => 'evt-wd-1',
            'event_type' => 'withdrawal',
            'data' => [
                'id' => 'wd-plg-1',
                'status' => 'paid',
            ],
        ], [
            'X-Webhook-Code' => 'whsec-ok',
        ]);

        $response->assertOk();
        $this->assertSame('paid', $withdrawal->fresh()->status);
    }

    public function test_auto_payout_keeps_pending_until_api_confirms(): void
    {
        if (! Schema::hasTable('withdrawals') || ! Schema::hasTable('wallet_transactions')) {
            $this->markTestSkipped('withdrawals/wallet_transactions tables');
        }

        Setting::set('platform_payout_gateway', 'pluggou', null);
        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'spacepag', 'woovi', 'onlyup'])->delete();

        $this->seedPluggouCredentials('whsec-ok', [
            'pluggou_payout_min_brl' => '0',
            'pluggou_admin_fee_pix_brl' => '0',
            'pluggou_admin_fee_payout_brl' => '0',
        ]);

        Http::fake([
            'https://api.pluggoutech.com/api/withdrawals' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'wd-auto-1',
                    'status' => 'pending',
                    'amount' => 15000,
                    'liquid_amount' => 15000,
                ],
            ], 201),
        ]);

        $seller = User::factory()->create(['role' => User::ROLE_INFOPRODUTOR]);
        $seller->forceFill([
            'tenant_id' => $seller->id,
            'payout_settings' => [
                'payout_pix_key' => 'seller@example.com',
                'payout_pix_key_type' => 'email',
            ],
        ])->save();

        $withdrawal = Withdrawal::query()->create([
            'tenant_id' => $seller->id,
            'user_id' => $seller->id,
            'amount' => 150,
            'fee_amount' => 0,
            'net_amount' => 150,
            'bucket' => 'pix',
            'status' => 'pending',
            'currency' => 'BRL',
        ]);

        $result = app(WithdrawalAutoPayoutService::class)->attemptAutoPayout($withdrawal->fresh());

        $this->assertTrue($result['ok'] ?? false);
        $this->assertTrue($result['pending'] ?? false);

        $fresh = $withdrawal->fresh();
        $this->assertSame('pending', $fresh->status);
        $this->assertSame('pluggou', $fresh->payout_provider);
        $this->assertSame('wd-auto-1', $fresh->payout_external_id);
        $this->assertSame(0, WalletTransaction::query()
            ->where('withdrawal_id', $fresh->id)
            ->where('type', WalletTransaction::TYPE_WITHDRAWAL_COMPLETE)
            ->count());

        $this->assertSame('pluggou', PlatformPayoutGateway::activeSlug());
    }

    public function test_create_pix_payment_uses_cents_and_returns_emv(): void
    {
        $this->seedPluggouCredentials('whsec-ok');

        Http::fake([
            'https://api.pluggoutech.com/api/transactions' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'tx-create-1',
                    'amount' => 2500,
                    'pix' => ['emv' => '00020126TESTEMV'],
                ],
            ], 201),
        ]);

        $driver = new PluggouDriver;
        $cred = GatewayCredential::resolveForPayment(null, 'pluggou');
        $result = $driver->createPixPayment(
            $cred->getDecryptedCredentials(),
            25.00,
            [
                'name' => 'Cliente Teste',
                'document' => '52998224725',
                'email' => 'c@test.com',
                'phone' => '11988887777',
            ],
            'order-99',
            'https://example.com/webhooks/gateways/pluggou'
        );

        $this->assertSame('tx-create-1', $result['transaction_id']);
        $this->assertSame('00020126TESTEMV', $result['copy_paste']);

        Http::assertSent(function ($request) {
            $data = $request->data();

            return $request->url() === 'https://api.pluggoutech.com/api/transactions'
                && ($data['amount'] ?? null) === 2500
                && ($data['payment_method'] ?? null) === 'pix'
                && ($data['buyer']['buyer_document'] ?? null) === '52998224725';
        });
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function seedPluggouCredentials(string $webhookCode, array $extra = []): void
    {
        $cred = GatewayCredential::query()->firstOrNew([
            'tenant_id' => null,
            'gateway_slug' => 'pluggou',
        ]);
        $cred->is_connected = true;
        $cred->setEncryptedCredentials(array_merge([
            'public_key' => 'pk_live_test',
            'secret_key' => 'sk_live_test',
            'webhook_code' => $webhookCode,
        ], $extra));
        $cred->save();
    }
}
