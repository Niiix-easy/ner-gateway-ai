<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Services\AffiliateCommissionRecorder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Schema;

class BackfillAffiliateCommissionsCommand extends Command
{
    protected $signature = 'affiliate:backfill-commissions {--limit=0 : Máximo de pedidos (0 = todos)}';

    protected $description = 'Reconstrói registros em affiliate_commissions para vendas históricas via afiliado';

    public function handle(): int
    {
        if (! Schema::hasTable('affiliate_commissions')) {
            $this->error('Tabela affiliate_commissions não existe. Rode as migrations.');

            return self::FAILURE;
        }

        $limit = max(0, (int) $this->option('limit'));
        $processed = 0;
        $created = 0;
        $skipped = 0;

        $query = Order::query()
            ->where('status', 'completed')
            ->where(function ($q) {
                $q->whereNotNull('affiliate_user_id');
                $driver = \Illuminate\Support\Facades\DB::getDriverName();
                if ($driver === 'pgsql') {
                    $q->orWhereRaw("metadata->>'affiliate_user_id' IS NOT NULL AND metadata->>'affiliate_user_id' <> ''");
                } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
                    $q->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.affiliate_user_id')) IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.affiliate_user_id')) <> '' AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.affiliate_user_id')) <> 'null'");
                }
            })
            ->orderBy('id');

        if ($limit > 0) {
            $query->limit($limit);
        }

        $query->chunkById(100, function ($orders) use (&$processed, &$created, &$skipped) {
            foreach ($orders as $order) {
                $processed++;
                $before = \App\Models\AffiliateCommission::query()->where('order_id', $order->id)->exists();
                $order->syncAffiliateColumnsFromMetadata();
                if ($order->isDirty(['affiliate_user_id', 'affiliate_enrollment_id'])) {
                    $order->saveQuietly();
                }
                $result = AffiliateCommissionRecorder::recordForOrder($order);
                if ($result !== null && ! $before) {
                    $created++;
                } else {
                    $skipped++;
                }
            }
        });

        $this->info("Processados: {$processed} | Criados: {$created} | Ignorados/existentes: {$skipped}");

        return self::SUCCESS;
    }
}
