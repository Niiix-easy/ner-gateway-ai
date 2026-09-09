<?php

namespace App\Console\Commands;

use App\Models\GatewayCredential;
use App\Models\Withdrawal;
use App\Services\MerchantWithdrawalService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;
use Plugins\Umbellapag\UmbellapagDriver;
use Plugins\Umbellapag\UmbellapagPayoutService;

class ReconcileUmbellapagWithdrawalsCommand extends Command
{
    protected $signature = 'withdrawals:reconcile-umbrellapag
                            {--limit=80 : Máximo de saques para checar por execução}
                            {--min-age-minutes=0 : Ignorar registros atualizados há menos de X minutos}
                            {--hours=48 : Janela máxima desde a criação do saque}
                            {--withdrawal= : ID interno do saque (um registro; ignora min-age)}';

    protected $description = 'Consulta na UmbrellaPag saques PIX pendentes e marca como pagos ou falhos conforme a API.';

    public function handle(): int
    {
        if (! class_exists(UmbellapagPayoutService::class) || ! class_exists(UmbellapagDriver::class)) {
            return self::SUCCESS;
        }

        if (! Schema::hasTable('withdrawals')) {
            return self::SUCCESS;
        }

        $limit = max(1, (int) $this->option('limit'));
        $minAge = max(0, (int) $this->option('min-age-minutes'));
        $hours = max(1, (int) $this->option('hours'));
        $onlyId = $this->option('withdrawal');

        $cred = GatewayCredential::resolveForPayment(null, 'umbrellapag');
        if ($cred === null || ! $cred->is_connected) {
            return self::SUCCESS;
        }

        $credentials = $cred->getDecryptedCredentials();
        if ($credentials === []) {
            return self::SUCCESS;
        }

        $payout = new UmbellapagPayoutService;

        if ($onlyId !== null && $onlyId !== '') {
            $w = Withdrawal::query()->find((int) $onlyId);
            if ($w === null) {
                $this->error('Saque não encontrado.');

                return self::FAILURE;
            }
            if (! in_array($w->status, ['pending', 'processing'], true) || $w->payout_provider !== 'umbrellapag') {
                $this->warn('Saque ignorado (não está pending/processing umbrellapag).');

                return self::SUCCESS;
            }
            $tx = trim((string) $w->payout_external_id);
            if ($tx === '') {
                $this->error('Saque sem payout_external_id; não é possível consultar na UmbrellaPag.');

                return self::FAILURE;
            }

            return $this->reconcileOne($payout, $w, $tx, $credentials) ? self::SUCCESS : self::FAILURE;
        }

        $q = Withdrawal::query()
            ->whereIn('status', ['pending', 'processing'])
            ->where('payout_provider', 'umbrellapag')
            ->whereNotNull('payout_external_id')
            ->where('payout_external_id', '!=', '')
            ->where('created_at', '>=', now()->subHours($hours));

        if ($minAge > 0) {
            $q->where('updated_at', '<=', now()->subMinutes($minAge));
        }

        $rows = $q->orderBy('id')->limit($limit)->get();

        $paid = 0;
        $failed = 0;

        foreach ($rows as $withdrawal) {
            $tx = trim((string) $withdrawal->payout_external_id);
            if ($tx === '') {
                continue;
            }

            $result = $this->applyApiStatus($payout, $withdrawal, $tx, $credentials);
            if ($result === 'paid') {
                $paid++;
            } elseif ($result === 'failed') {
                $failed++;
            }
        }

        if ($paid > 0) {
            $this->info("Marcados como pagos: {$paid}.");
        }
        if ($failed > 0) {
            $this->info("Marcados como falhos (saldo devolvido): {$failed}.");
        }

        return self::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    private function reconcileOne(UmbellapagPayoutService $payout, Withdrawal $withdrawal, string $externalId, array $credentials): bool
    {
        $result = $this->applyApiStatus($payout, $withdrawal, $externalId, $credentials);
        if ($result === 'paid') {
            $this->info('Saque marcado como pago.');

            return true;
        }
        if ($result === 'failed') {
            $this->info('Saque marcado como falho e saldo devolvido.');

            return true;
        }

        $this->warn('API retornou status: '.($result ?? 'null').' (esperado paid ou failed).');

        return false;
    }

    /**
     * @param  array<string, mixed>  $credentials
     * @return 'paid'|'failed'|null
     */
    private function applyApiStatus(
        UmbellapagPayoutService $payout,
        Withdrawal $withdrawal,
        string $externalId,
        array $credentials
    ): ?string {
        try {
            $apiStatus = $payout->getPayoutSettlementStatus($externalId, $credentials);
        } catch (\Throwable) {
            return null;
        }

        $meta = is_array($withdrawal->payout_meta) ? $withdrawal->payout_meta : [];
        $meta['reconcile_last_at'] = now()->toIso8601String();
        $meta['reconcile_last_api_status'] = $apiStatus;
        $withdrawal->update(['payout_meta' => $meta]);

        if ($apiStatus === 'paid') {
            MerchantWithdrawalService::markPaid($withdrawal->fresh());

            return 'paid';
        }

        if ($apiStatus === 'failed') {
            MerchantWithdrawalService::markFailed(
                $withdrawal->fresh(),
                'Payout UmbrellaPag cancelado ou falhou (reconciliação automática).'
            );

            return 'failed';
        }

        return $apiStatus;
    }
}
