<?php

namespace App\Http\Controllers;

use App\Events\DashboardLoading;
use App\Models\CheckoutSession;
use App\Models\Order;
use App\Models\Product;
use App\Plugins\PluginFeatureCatalog;
use App\Support\DashboardBannerSettings;
use App\Support\SqlDialect;
use Carbon\Carbon;
use App\Services\AffiliateCommissionQuery;
use App\Services\Checkout\CheckoutAbandonmentMetrics;
use App\Services\TeamAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    private const PERIODS = ['hoje', 'ontem', '7dias', 'mes', 'ano', 'total'];

    private const CACHE_TTL_SECONDS = 300; // 5 minutes

    public function __invoke(Request $request): Response
    {
        $period = $request->query('period', 'hoje');
        if (! in_array($period, self::PERIODS, true)) {
            $period = 'hoje';
        }

        $tenantId = auth()->user()->tenant_id;
        $userId = (int) auth()->id();
        $hasAffiliateEnrollments = AffiliateCommissionQuery::userHasApprovedEnrollments($userId);
        $cacheKey = 'dashboard:v7:'.($tenantId ?? 'global').':'.$userId.':'.$period;

        $payload = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($tenantId, $period, $userId, $hasAffiliateEnrollments) {
            [$start, $end] = $this->rangeForPeriod($period);

            $ordersQuery = Order::forTenant($tenantId);
            if (auth()->user()?->isTeam()) {
                $allowed = app(TeamAccessService::class)->allowedProductIdsFor(auth()->user());
                $ordersQuery->whereIn('product_id', $allowed ?: ['__none__']);
            }
        if ($start && $end) {
            $ordersQuery->whereBetween('created_at', [$start, $end]);
        } elseif ($start) {
            $ordersQuery->where('created_at', '>=', $start);
        } elseif ($end) {
            $ordersQuery->where('created_at', '<=', $end);
        }

        $ordersCompleted = (clone $ordersQuery)->where('status', 'completed');
        $ordersPending = (clone $ordersQuery)->where('status', 'pending');
        $ordersRefunded = (clone $ordersQuery)->where('status', 'refunded');

        $vendasTotais = (float) $ordersCompleted->sum('amount');
        $quantidadeVendas = $ordersCompleted->count();
        $vendasPendentes = (float) $ordersPending->sum('amount');
        $reembolsosCount = $ordersRefunded->count();
        $reembolsosTotal = (float) (clone $ordersQuery)->where('status', 'refunded')->sum('amount');

        if ($hasAffiliateEnrollments) {
            $affiliateRequest = Request::create('/', 'GET', ['period' => $period]);
            $affiliateApproved = AffiliateCommissionQuery::applyFilters(
                AffiliateCommissionQuery::baseQuery($userId),
                $affiliateRequest,
            )
                ->where('status', \App\Models\AffiliateCommission::STATUS_APPROVED)
                ->get(['commission_net']);

            $affiliateTotal = (float) $affiliateApproved->sum('commission_net');
            $affiliateCount = $affiliateApproved->count();

            $vendasTotais += $affiliateTotal;
            $quantidadeVendas += $affiliateCount;
        }

        $ticketMedio = $quantidadeVendas > 0 ? $vendasTotais / $quantidadeVendas : 0.0;

        $formasPagamentoRows = (clone $ordersQuery)
            ->where('status', 'completed')
            ->select(['payment_method', 'metadata', 'gateway', 'amount'])
            ->get();

        $formasPagamento = $formasPagamentoRows
            ->groupBy(fn (Order $o) => $o->paymentMethodReportKey())
            ->map(function ($rows, $method) {
                return [
                    'metodo' => $method,
                    'label' => Order::paymentMethodReportLabel($method),
                    'total' => (float) $rows->sum(fn (Order $o) => (float) $o->amount),
                    'quantidade' => (int) $rows->count(),
                    '_sort' => Order::paymentMethodReportSort($method),
                ];
            })
            ->sortBy('_sort')
            ->map(function (array $row) {
                unset($row['_sort']);
                return $row;
            })
            ->values()
            ->all();

        $graficoVendas = $this->buildGraficoVendas($tenantId, $period, $start, $end, $hasAffiliateEnrollments ? $userId : null);

        $productsQuery = Product::forTenant($tenantId);
        if (auth()->user()?->isTeam()) {
            $allowed = app(TeamAccessService::class)->allowedProductIdsFor(auth()->user());
            $productsQuery->whereIn('id', $allowed ?: ['__none__']);
        }
        $quantidadeProdutos = $productsQuery->count();

            $funnel = $this->checkoutFunnelStats($tenantId, $start, $end);

            $ultimasVendas = (clone $ordersQuery)
                ->with(['user:id,name', 'product:id,name,tenant_id'])
                ->orderByDesc('created_at')
                ->limit(6)
                ->get()
                ->map(fn (Order $o) => [
                    'id' => $o->id,
                    'referencia' => $o->public_reference,
                    'cliente' => $o->user?->name ?: ($o->email ?: '–'),
                    'produto' => $o->product?->name ?: '–',
                    'metodo' => $o->paymentMethodReportKey(),
                    'metodo_label' => $o->paymentMethodDisplayLabel(),
                    'status' => (string) $o->status,
                    'status_label' => self::statusLabel($o->status),
                    'status_intencao' => self::statusIntent($o->status),
                    'valor' => (float) $o->amount,
                    'data' => $o->created_at?->format('d/m/Y H:i'),
                ])
                ->all();

            /* Ranking de produtos do período: leitura que só faz sentido no painel —
               Vendas mostra pedido a pedido, aqui interessa quem puxa o faturamento. */
            $rankingRows = (clone $ordersQuery)
                ->where('status', 'completed')
                ->whereNotNull('product_id')
                ->selectRaw('product_id, SUM(amount) as total, COUNT(*) as quantidade')
                ->groupBy('product_id')
                ->orderByDesc('total')
                ->limit(5)
                ->get();

            $rankingNomes = Product::forTenant($tenantId)
                ->whereIn('id', $rankingRows->pluck('product_id')->all() ?: ['__none__'])
                ->pluck('name', 'id');

            $vendasPorProduto = $rankingRows
                ->map(fn ($row) => [
                    'id' => $row->product_id,
                    'nome' => $rankingNomes[$row->product_id] ?? '–',
                    'total' => round((float) $row->total, 2),
                    'quantidade' => (int) $row->quantidade,
                ])
                ->all();

            return [
                'period' => $period,
                'vendas_totais' => round($vendasTotais, 2),
                'vendas_pendentes' => round($vendasPendentes, 2),
                'quantidade_vendas' => $quantidadeVendas,
                'ticket_medio' => round($ticketMedio, 2),
                'formas_pagamento' => $formasPagamento,
                'taxa_conversao' => $funnel['taxa_conversao'],
                'abandono_carrinho' => $funnel['abandono_carrinho'],
                'reembolsos_count' => $reembolsosCount,
                'reembolsos_total' => round($reembolsosTotal, 2),
                'quantidade_produtos' => $quantidadeProdutos,
                'grafico_vendas' => $graficoVendas,
                'ultimas_vendas' => $ultimasVendas,
                'vendas_por_produto' => $vendasPorProduto,
            ];
        });

        $infoprodutosActive = PluginFeatureCatalog::active(PluginFeatureCatalog::FEATURE_INFOPRODUTOS);
        if (! $infoprodutosActive) {
            $payload['quantidade_produtos'] = 0;
        }
        $payload['show_products_metric'] = $infoprodutosActive;

        $data = new \ArrayObject($payload);
        $data['dashboard_banners'] = DashboardBannerSettings::banners(activeOnly: true, resolveUrls: true);
        $data['has_affiliate_enrollments'] = $hasAffiliateEnrollments;
        $data['affiliate_stats'] = null;
        $data['affiliate_recent_sales'] = [];

        event(new DashboardLoading($data));

        return Inertia::render('Dashboard/Index', $data->getArrayCopy());
    }

    /** Rótulo do status do pedido, igual ao usado na tela de Vendas. */
    private static function statusLabel(?string $status): string
    {
        return [
            'completed' => 'Pago',
            'pending' => 'Pendente',
            'disputed' => 'MED',
            'cancelled' => 'Cancelado',
            'refunded' => 'Reembolsado',
        ][$status ?? ''] ?? ($status ?: '–');
    }

    /**
     * Intenção do selo Andes para cada status: positivo, cautela, negativo ou
     * neutro. Vermelho fica reservado a falha e recusa.
     */
    private static function statusIntent(?string $status): string
    {
        return [
            'completed' => 'positive',
            'pending' => 'caution',
            'disputed' => 'caution',
            'cancelled' => 'negative',
            'refunded' => 'neutral',
        ][$status ?? ''] ?? 'neutral';
    }

    /**
     * Abandono: sessões válidas deduplicadas (e-mail + produto, form com e-mail, após graça).
     * Taxa de conversão: sessões com pedido completed / total de sessões no período (created_at).
     *
     * @return array{taxa_conversao: float, abandono_carrinho: int}
     */
    private function checkoutFunnelStats(?int $tenantId, ?string $start, ?string $end): array
    {
        $productIds = null;
        $sessionsQuery = CheckoutSession::forTenant($tenantId);
        if (auth()->user()?->isTeam()) {
            $allowed = app(TeamAccessService::class)->allowedProductIdsFor(auth()->user());
            $productIds = $allowed ?: ['__none__'];
            $sessionsQuery->whereIn('product_id', $productIds);
        }

        if ($start && $end) {
            $sessionsQuery->whereBetween('created_at', [$start, $end]);
        } elseif ($start) {
            $sessionsQuery->where('created_at', '>=', $start);
        } elseif ($end) {
            $sessionsQuery->where('created_at', '<=', $end);
        }

        $converted = (clone $sessionsQuery)
            ->whereFunnelConversionCompleted()
            ->count();

        $abandonadosTotal = app(CheckoutAbandonmentMetrics::class)
            ->countValidAbandoned($tenantId, $productIds, $start, $end);

        $totalSessions = (clone $sessionsQuery)->count();
        $taxaConversao = $totalSessions > 0 ? round((float) $converted / $totalSessions * 100, 1) : 0.0;

        return [
            'taxa_conversao' => $taxaConversao,
            'abandono_carrinho' => $abandonadosTotal,
        ];
    }

    private function rangeForPeriod(string $period): array
    {
        $now = Carbon::now();
        $start = null;
        $end = null;

        switch ($period) {
            case 'hoje':
                $start = $now->copy()->startOfDay();
                $end = $now->copy()->endOfDay();
                break;
            case 'ontem':
                $start = $now->copy()->subDay()->startOfDay();
                $end = $now->copy()->subDay()->endOfDay();
                break;
            case '7dias':
                $start = $now->copy()->subDays(6)->startOfDay();
                $end = $now->copy()->endOfDay();
                break;
            case 'mes':
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->endOfMonth();
                break;
            case 'ano':
                $start = $now->copy()->startOfYear();
                $end = $now->copy()->endOfYear();
                break;
            case 'total':
                break;
        }

        return [$start?->toDateTimeString(), $end?->toDateTimeString()];
    }

    private function buildGraficoVendas(?int $tenantId, string $period, ?string $start, ?string $end, ?int $affiliateUserId = null): array
    {
        $query = Order::forTenant($tenantId)->where('status', 'completed');
        if (auth()->user()?->isTeam()) {
            $allowed = app(TeamAccessService::class)->allowedProductIdsFor(auth()->user());
            $query->whereIn('product_id', $allowed ?: ['__none__']);
        }

        if ($start && $end) {
            $query->whereBetween('created_at', [$start, $end]);
        } elseif ($start) {
            $query->where('created_at', '>=', $start);
        } elseif ($end) {
            $query->where('created_at', '<=', $end);
        }

        $affiliateRequest = $affiliateUserId
            ? Request::create('/', 'GET', ['period' => $period])
            : null;

        $isHourly = in_array($period, ['hoje', 'ontem'], true);

        if ($isHourly) {
            $hour = SqlDialect::hourExpression('created_at');
            $rows = $query
                ->selectRaw($hour.' as hora, SUM(amount) as total')
                ->groupBy('hora')
                ->orderBy('hora')
                ->get()
                ->keyBy('hora');

            $affiliateByHour = $affiliateUserId
                ? AffiliateCommissionQuery::approvedCommissionTotalsByHour($affiliateUserId, $affiliateRequest)
                : [];

            $result = [];
            for ($h = 0; $h <= 23; $h++) {
                $result[] = [
                    'data' => (string) $h,
                    'total' => (float) ($rows->get($h)?->total ?? 0) + ($affiliateByHour[$h] ?? 0),
                ];
            }

            return $result;
        }

        $dateExpr = SqlDialect::dateExpression('created_at');
        $rows = $query
            ->selectRaw($dateExpr.' as data, SUM(amount) as total')
            ->groupBy('data')
            ->orderBy('data')
            ->get()
            ->keyBy('data');

        $affiliateByDate = $affiliateUserId
            ? AffiliateCommissionQuery::approvedCommissionTotalsByDate($affiliateUserId, $affiliateRequest)
            : [];

        $dates = collect($rows->keys())->merge(array_keys($affiliateByDate))->unique()->sort()->values();

        if ($dates->isEmpty()) {
            return [];
        }

        return $dates->map(function (string $date) use ($rows, $affiliateByDate) {
            return [
                'data' => $date,
                'total' => (float) ($rows->get($date)?->total ?? 0) + ($affiliateByDate[$date] ?? 0),
            ];
        })->values()->all();
    }

}
