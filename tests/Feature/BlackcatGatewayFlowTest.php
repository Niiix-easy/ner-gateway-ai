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
use Plugins\Blackcat\BlackcatDriver;
use Plugins\Blackcat\BlackcatWebhookHandler;
use Tests\TestCase;

class BlackcatGatewayFlowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        GatewayRegistry::register([
            'slug' => 'blackcat',
            'name' => 'BlackCat',
            'methods' => ['pix'],
            'driver' => BlackcatDriver::class,
            'webhook_handler' => BlackcatWebhookHandler::class,
            'credential_keys' => [],
        ]);
    }

    public function test_webhook_rejects_invalid_token(): void
    {
        $this->seedBlackcatCredentials('tok-correct');

        $response = $this->postJson('/webhooks/gateways/blackcat?token=wrong', [
            'event' => 'transaction.paid',
            'transactionId' => 'TXN-1',
            'status' => 'PAID',
        ], [
            'X-Webhook-Source' => 'blackcat-api',
            'X-Webhook-Event' => 'transaction.paid',
        ]);

        $response->assertStatus(401);
    }

    public function test_transaction_webhook_reconfirms_and_pays_order(): void
    {
        $this->seedBlackcatCredentials('tok-ok');

        Http::fake([
            'https://api.blackcatoficial.com/api/sales/*/status' => Http::response([
                'success' => true,
                'data' => [
                    'transactionId' => 'TXN-bc-1',
                    'status' => 'PAID',
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
            'gateway' => 'blackcat',
            'gateway_id' => 'TXN-bc-1',
        ]);

        $response = $this->postJson('/webhooks/gateways/blackcat?token=tok-ok', [
            'event' => 'transaction.paid',
            'transactionId' => 'TXN-bc-1',
            'status' => 'PAID',
            'amount' => 1000,
        ], [
            'X-Webhook-Source' => 'blackcat-api',
            'X-Webhook-Event' => 'transaction.paid',
        ]);

        $response->assertOk();
        $this->assertSame('completed', $order->fresh()->status);
    }

    public function test_withdrawal_webhook_marks_paid(): void
    {
        if (! Schema::hasTable('withdrawals')) {
            $this->markTestSkipped('withdrawals table');
        }

        $this->seedBlackcatCredentials('tok-ok');

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
            'payout_provider' => 'blackcat',
            'payout_external_id' => 'wd-bc-1',
        ]);

        $response = $this->postJson('/webhooks/gateways/blackcat?token=tok-ok', [
            'event' => 'withdrawal.completed',
            'withdrawalId' => 'wd-bc-1',
            'status' => 'COMPLETED',
            'amount' => 5000,
        ], [
            'X-Webhook-Source' => 'blackcat-api',
            'X-Webhook-Event' => 'withdrawal.completed',
        ]);

        $response->assertOk();
        $this->assertSame('paid', $withdrawal->fresh()->status);
    }

    public function test_auto_payout_keeps_pending_until_webhook(): void
    {
        if (! Schema::hasTable('withdrawals') || ! Schema::hasTable('wallet_transactions')) {
            $this->markTestSkipped('withdrawals/wallet_transactions tables');
        }

        Setting::set('platform_payout_gateway', 'blackcat', null);
        GatewayCredential::query()->whereIn('gateway_slug', ['cajupay', 'spacepag', 'woovi', 'onlyup', 'pluggou'])->delete();

        $this->seedBlackcatCredentials('tok-ok', [
            'blackcat_payout_min_brl' => '0',
            'blackcat_admin_fee_pix_brl' => '0',
            'blackcat_admin_fee_payout_brl' => '0',
        ]);

        Http::fake([
            'https://api.blackcatoficial.com/api/sales/create-withdrawal' => Http::response([
                'success' => true,
                'data' => [
                    'id' => 'wd-auto-bc-1',
                    'status' => 'PROCESSING',
                    'amount' => 150.00,
                    'netAmount' => 150.00,
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
        $this->assertSame('blackcat', $fresh->payout_provider);
        $this->assertSame('wd-auto-bc-1', $fresh->payout_external_id);
        $this->assertSame(0, WalletTransaction::query()
            ->where('withdrawal_id', $fresh->id)
            ->where('type', WalletTransaction::TYPE_WITHDRAWAL_COMPLETE)
            ->count());

        $this->assertSame('blackcat', PlatformPayoutGateway::activeSlug());
    }

    public function test_create_pix_payment_uses_cents_and_api_key(): void
    {
        $this->seedBlackcatCredentials('tok-ok');

        Http::fake([
            'https://api.blackcatoficial.com/api/sales/create-sale' => Http::response([
                'success' => true,
                'data' => [
                    'transactionId' => 'TXN-create-1',
                    'status' => 'PENDING',
                    'amount' => 2500,
                    'paymentData' => [
                        'qrCode' => '00020126TESTEMV',
                        'copyPaste' => '00020126TESTEMV',
                    ],
                ],
            ], 201),
        ]);

        $driver = new BlackcatDriver;
        $cred = GatewayCredential::resolveForPayment(null, 'blackcat');
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
            'https://example.com/webhooks/gateways/blackcat'
        );

        $this->assertSame('TXN-create-1', $result['transaction_id']);
        $this->assertSame('00020126TESTEMV', $result['copy_paste']);

        Http::assertSent(function ($request) {
            $data = $request->data();

            return $request->url() === 'https://api.blackcatoficial.com/api/sales/create-sale'
                && $request->hasHeader('X-API-Key', 'bc_api_key_test')
                && ($data['amount'] ?? null) === 2500
                && ($data['paymentMethod'] ?? null) === 'pix'
                && ($data['customer']['document']['number'] ?? null) === '52998224725'
                && ($data['externalRef'] ?? null) === 'order-99'
                && str_contains((string) ($data['postbackUrl'] ?? ''), 'token=tok-ok');
        });
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function seedBlackcatCredentials(string $webhookToken, array $extra = []): void
    {
        $cred = GatewayCredential::query()->firstOrNew([
            'tenant_id' => null,
            'gateway_slug' => 'blackcat',
        ]);
        $cred->is_connected = true;
        $cred->setEncryptedCredentials(array_merge([
            'api_key' => 'bc_api_key_test',
            'webhook_token' => $webhookToken,
        ], $extra));
        $cred->save();
    }
}
