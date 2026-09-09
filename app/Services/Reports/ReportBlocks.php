<?php

namespace App\Services\Reports;

use App\Models\CheckoutSession;
use App\Models\MedDispute;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;

/**
 * Blocos da tela de Relatórios.
 *
 * Cada método devolve um bloco pronto para a tela, já ordenado e com os
 * rótulos escritos. Tudo sai do que o banco realmente guarda:
 *
 *  - `orders`            → faturamento, transações por status, cupons
 *  - `med_disputes`      → chargebacks (o MED do Pix é o nosso chargeback)
 *  - `checkout_sessions` → acessos, origem (UTM/SRC), aparelho, sistema,
 *                          visitante novo × recorrente e tempo de checkout
 *
 * Aparelho e sistema saem do `meta_user_agent` gravado na sessão; não há
 * outro sinal no banco, e é o mesmo caminho que qualquer analítico usa.
 */
class ReportBlocks
{
    /**
     * População por UF (Censo IBGE 2022) — base da densidade de vendas por
     * 100 mil habitantes. Sem isso o número de vendas por estado só repete o
     * ranking de população.
     */
    private const UF_POPULATION = [
        'AC' => 830018, 'AL' => 3127683, 'AP' => 733759, 'AM' => 3941613,
        'BA' => 14136417, 'CE' => 8794957, 'DF' => 2817381, 'ES' => 3833712,
        'GO' => 7056495, 'MA' => 6775805, 'MT' => 3658649, 'MS' => 2757013,
        'MG' => 20538718, 'PA' => 8120131, 'PB' => 3974687, 'PR' => 11444380,
        'PE' => 9058931, 'PI' => 3271199, 'RJ' => 16055174, 'RN' => 3302729,
        'RS' => 10882965, 'RO' => 1581196, 'RR' => 636707, 'SC' => 7610361,
        'SP' => 44411238, 'SE' => 2210004, 'TO' => 1511460,
    ];

    private const UF_NAME = [
        'AC' => 'Acre', 'AL' => 'Alagoas', 'AP' => 'Amapá', 'AM' => 'Amazonas',
        'BA' => 'Bahia', 'CE' => 'Ceará', 'DF' => 'Distrito Federal', 'ES' => 'Espírito Santo',
        'GO' => 'Goiás', 'MA' => 'Maranhão', 'MT' => 'Mato Grosso', 'MS' => 'Mato Grosso do Sul',
        'MG' => 'Minas Gerais', 'PA' => 'Pará', 'PB' => 'Paraíba', 'PR' => 'Paraná',
        'PE' => 'Pernambuco', 'PI' => 'Piauí', 'RJ' => 'Rio de Janeiro', 'RN' => 'Rio Grande do Norte',
        'RS' => 'Rio Grande do Sul', 'RO' => 'Rondônia', 'RR' => 'Roraima', 'SC' => 'Santa Catarina',
        'SP' => 'São Paulo', 'SE' => 'Sergipe', 'TO' => 'Tocantins',
    ];

    /** Status de pedido agrupados nas três colunas da referência. */
    private const STATUS_APPROVED = ['completed', 'paid', 'approved'];

    private const STATUS_PENDING = ['pending', 'processing', 'waiting_payment', 'authorized'];

    private const STATUS_REFUSED = ['failed', 'refused', 'denied', 'canceled', 'cancelled', 'expired', 'chargeback', 'refunded'];

    // =====================================================================
    // FATURAMENTO
    // =====================================================================

    /**
     * Transações por situação: total no topo, e aprovadas / pendentes /
     * recusadas com participação. É a leitura de saúde do checkout.
     *
     * @return array{total:int, linhas:array<int, array{chave:string,label:string,quantidade:int,participacao:float}>}
     */
    public function transacoes(Builder $orders): array
    {
        $counts = (clone $orders)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $sum = static fn (array $statuses) => (int) collect($statuses)
            ->sum(fn (string $s) => (int) ($counts[$s] ?? 0));

        $aprovadas = $sum(self::STATUS_APPROVED);
        $pendentes = $sum(self::STATUS_PENDING);
        $recusadas = $sum(self::STATUS_REFUSED);
        $total = (int) $counts->sum();

        // O que não cai em nenhum balde conhecido entra como recusada para o
        // total nunca ficar diferente da soma das linhas.
        $recusadas += max(0, $total - ($aprovadas + $pendentes + $recusadas));

        $share = static fn (int $n) => $total > 0 ? round($n / $total * 100, 1) : 0.0;

        return [
            'total' => $total,
            'linhas' => [
                ['chave' => 'aprovadas', 'label' => 'Aprovadas', 'quantidade' => $aprovadas, 'participacao' => $share($aprovadas)],
                ['chave' => 'pendentes', 'label' => 'Pendente', 'quantidade' => $pendentes, 'participacao' => $share($pendentes)],
                ['chave' => 'recusadas', 'label' => 'Recusadas', 'quantidade' => $recusadas, 'participacao' => $share($recusadas)],
            ],
        ];
    }

    /**
     * Chargebacks: no Pix o equivalente é a disputa MED, que guarda o valor
     * em centavos.
     *
     * @return array{quantidade:int, total:float}
     */
    public function chargebacks(?int $tenantId, mixed $start, mixed $end): array
    {
        $query = MedDispute::query();
        $query = $tenantId === null
            ? $query->whereNull('tenant_id')
            : $query->where('tenant_id', $tenantId);

        $this->applyRange($query, $start, $end);

        $rows = $query->get(['amount_cents']);

        return [
            'quantidade' => $rows->count(),
            'total' => round($rows->sum(fn ($d) => (int) $d->amount_cents) / 100, 2),
        ];
    }

    /**
     * Faturamento por aparelho — o mesmo recorte de "meios de pagamento",
     * mas pelo aparelho de quem comprou. Vem da sessão de checkout ligada
     * ao pedido pago.
     *
     * @return array<int, array{chave:string,label:string,quantidade:int,total:float,participacao:float}>
     */
    public function faturamentoPorAparelho(Builder $paidOrders): array
    {
        $rows = (clone $paidOrders)
            ->with('checkoutSession:id,order_id,meta_user_agent')
            ->get(['id', 'amount']);

        $buckets = ['desktop' => ['q' => 0, 't' => 0.0], 'mobile' => ['q' => 0, 't' => 0.0], 'tablet' => ['q' => 0, 't' => 0.0]];

        foreach ($rows as $order) {
            $device = $this->deviceFromUserAgent($order->checkoutSession?->meta_user_agent);
            $buckets[$device]['q']++;
            $buckets[$device]['t'] += (float) $order->amount;
        }

        $total = array_sum(array_column($buckets, 't'));

        return collect($buckets)
            ->map(fn (array $b, string $key) => [
                'chave' => $key,
                'label' => ['desktop' => 'Desktop', 'mobile' => 'Mobile', 'tablet' => 'Tablet'][$key],
                'quantidade' => $b['q'],
                'total' => round($b['t'], 2),
                'participacao' => $total > 0 ? round($b['t'] / $total * 100, 1) : 0.0,
            ])
            ->values()
            ->all();
    }

    /**
     * Meios de pagamento com as três linhas fixas — Cartão, Boleto e Pix
     * aparecem sempre, mesmo zeradas. Linha que some quando zera faz o
     * vendedor achar que o relatório não carregou.
     *
     * @param  array<int, array{metodo:string,label:string,total:float,quantidade:int}>  $encontrados
     * @return array<int, array{metodo:string,label:string,total:float,quantidade:int,participacao:float}>
     */
    public function meiosDePagamento(array $encontrados): array
    {
        $porMetodo = collect($encontrados)->keyBy('metodo');
        $total = collect($encontrados)->sum(fn (array $r) => (float) $r['total']);

        $linhas = collect(['card' => 'Cartão', 'boleto' => 'Boleto', 'pix' => 'PIX'])
            ->map(function (string $label, string $metodo) use ($porMetodo) {
                $row = $porMetodo->get($metodo);

                return [
                    'metodo' => $metodo,
                    'label' => $label,
                    'total' => (float) ($row['total'] ?? 0),
                    'quantidade' => (int) ($row['quantidade'] ?? 0),
                ];
            })
            ->values();

        // O que não é cartão, boleto ou pix entra depois, como "Outro"
        $outros = collect($encontrados)->reject(fn (array $r) => in_array($r['metodo'], ['card', 'boleto', 'pix'], true));

        return $linhas->concat($outros->map(fn (array $r) => [
            'metodo' => $r['metodo'],
            'label' => $r['label'],
            'total' => (float) $r['total'],
            'quantidade' => (int) $r['quantidade'],
        ]))->map(fn (array $r) => [
            ...$r,
            'participacao' => $total > 0 ? round($r['total'] / $total * 100, 1) : 0.0,
        ])->values()->all();
    }

    // =====================================================================
    // MARKETING
    // =====================================================================

    /**
     * Conversão por estado. As 27 UFs sempre aparecem — na referência as sem
     * dado mostram "--", e some a dúvida de "será que faltou carregar?".
     * A UF sai do endereço de entrega do pedido; sem endereço, cai no
     * cadastro de quem comprou.
     *
     * @return array<int, array{posicao:int,uf:string,nome:string,vendas:int,participacao:?float,densidade:?float}>
     */
    public function conversaoPorEstado(Builder $paidOrders): array
    {
        $rows = (clone $paidOrders)
            ->with('user:id,address_state')
            ->get(['id', 'user_id', 'shipping_address']);

        $counts = [];
        foreach ($rows as $order) {
            $uf = $this->ufFromOrder($order);
            if ($uf === null) {
                continue;
            }
            $counts[$uf] = ($counts[$uf] ?? 0) + 1;
        }

        $total = array_sum($counts);

        $items = [];
        foreach (self::UF_NAME as $uf => $nome) {
            $vendas = (int) ($counts[$uf] ?? 0);
            $items[] = [
                'uf' => $uf,
                'nome' => $nome,
                'vendas' => $vendas,
                'participacao' => $total > 0 && $vendas > 0 ? round($vendas / $total * 100, 1) : null,
                'densidade' => $vendas > 0
                    ? round($vendas / self::UF_POPULATION[$uf] * 100000, 2)
                    : null,
            ];
        }

        // Quem vendeu vem primeiro, por densidade; o resto segue em ordem alfabética
        usort($items, function (array $a, array $b) {
            if (($a['vendas'] > 0) !== ($b['vendas'] > 0)) {
                return $b['vendas'] <=> $a['vendas'];
            }
            if ($a['vendas'] > 0) {
                return $b['densidade'] <=> $a['densidade'];
            }

            return strcmp($a['uf'], $b['uf']);
        });

        foreach ($items as $i => &$item) {
            $item['posicao'] = $i + 1;
        }

        return $items;
    }

    /**
     * Origens do tráfego. `utm` lê utm_source (com meio e campanha juntos no
     * rótulo); `src` lê o parâmetro src, que é o do link de afiliado.
     *
     * @return array{utm:array<int,array>, src:array<int,array>}
     */
    public function origens(Builder $sessions): array
    {
        $rows = (clone $sessions)
            ->with('order:id,amount,status')
            ->get(['id', 'order_id', 'utm_source', 'utm_medium', 'utm_campaign', 'src']);

        $collect = function (callable $labelFn) use ($rows) {
            $map = [];
            foreach ($rows as $s) {
                $label = $labelFn($s);
                if ($label === null || $label === '') {
                    $label = 'Direto / sem origem';
                }
                $map[$label] ??= ['origem' => $label, 'vendas' => 0, 'valor' => 0.0, 'sessoes' => 0];
                $map[$label]['sessoes']++;

                $order = $s->order;
                if ($order && in_array($order->status, self::STATUS_APPROVED, true)) {
                    $map[$label]['vendas']++;
                    $map[$label]['valor'] += (float) $order->amount;
                }
            }

            return collect($map)
                ->map(fn (array $r) => [...$r, 'valor' => round($r['valor'], 2)])
                ->sortByDesc('valor')
                ->sortByDesc('vendas')
                ->values()
                ->take(20)
                ->all();
        };

        return [
            'utm' => $collect(function ($s) {
                $parts = array_filter([$s->utm_source, $s->utm_medium, $s->utm_campaign]);

                return $parts ? implode(' · ', $parts) : null;
            }),
            'src' => $collect(fn ($s) => $s->src),
        ];
    }

    /**
     * Visitante novo × recorrente: recorrente é quem já apareceu numa sessão
     * anterior ao período com o mesmo e-mail.
     *
     * @return array<int, array{chave:string,label:string,quantidade:int,participacao:float}>
     */
    public function visitantes(Builder $sessions, ?int $tenantId, mixed $start): array
    {
        $emails = (clone $sessions)->whereNotNull('email')->pluck('email')->map(fn ($e) => mb_strtolower(trim((string) $e)))->filter()->unique();
        $totalSessoes = (clone $sessions)->count();

        $recorrentes = 0;
        if ($emails->isNotEmpty() && $start !== null) {
            $anterior = CheckoutSession::forTenant($tenantId)
                ->where('created_at', '<', $start)
                ->whereIn('email', $emails->all())
                ->distinct()
                ->pluck('email')
                ->map(fn ($e) => mb_strtolower(trim((string) $e)))
                ->unique();
            $recorrentes = $anterior->count();
        }

        $identificados = $emails->count();
        $novos = max(0, $identificados - $recorrentes);
        $anonimos = max(0, $totalSessoes - $identificados);
        $base = max(1, $novos + $recorrentes);

        return [
            ['chave' => 'novos', 'label' => 'Novos', 'quantidade' => $novos, 'participacao' => round($novos / $base * 100, 1)],
            ['chave' => 'recorrentes', 'label' => 'Recorrentes', 'quantidade' => $recorrentes, 'participacao' => round($recorrentes / $base * 100, 1)],
            ['chave' => 'anonimos', 'label' => 'Sem identificação', 'quantidade' => $anonimos, 'participacao' => 0.0],
        ];
    }

    /**
     * Acessos por aparelho e por sistema operacional, e o tempo médio até
     * fechar o checkout. Uma passada só na tabela — são três recortes do
     * mesmo `meta_user_agent`.
     *
     * @return array{dispositivos:array, sistemas:array, tempo:array}
     */
    public function comportamento(Builder $sessions): array
    {
        $rows = (clone $sessions)->get(['id', 'meta_user_agent', 'form_started_at', 'form_filled_at']);

        $devices = ['desktop' => 0, 'mobile' => 0, 'tablet' => 0];
        $os = ['Windows' => 0, 'iOS' => 0, 'Macintosh' => 0, 'Android' => 0, 'Linux' => 0, 'Chrome OS' => 0, 'Outros' => 0];
        $times = ['geral' => [], 'desktop' => [], 'mobile' => []];

        foreach ($rows as $s) {
            $ua = (string) ($s->meta_user_agent ?? '');
            $device = $this->deviceFromUserAgent($ua);
            $devices[$device]++;
            $os[$this->osFromUserAgent($ua)]++;

            if ($s->form_started_at && $s->form_filled_at) {
                $seconds = $s->form_filled_at->getTimestamp() - $s->form_started_at->getTimestamp();
                if ($seconds >= 0 && $seconds <= 3600) {
                    $times['geral'][] = $seconds;
                    if (isset($times[$device])) {
                        $times[$device][] = $seconds;
                    }
                }
            }
        }

        $totalDev = array_sum($devices);
        $totalOs = array_sum($os);
        $avg = static fn (array $v) => $v ? (int) round(array_sum($v) / count($v)) : null;

        return [
            'dispositivos' => collect($devices)
                ->map(fn (int $q, string $k) => [
                    'chave' => $k,
                    'label' => 'web / '.$k,
                    'quantidade' => $q,
                    'participacao' => $totalDev > 0 ? round($q / $totalDev * 100, 1) : 0.0,
                ])->values()->all(),
            'sistemas' => collect($os)
                ->filter(fn (int $q, string $k) => $q > 0 || $k !== 'Outros')
                ->map(fn (int $q, string $k) => [
                    'chave' => $k,
                    'label' => $k,
                    'quantidade' => $q,
                    'participacao' => $totalOs > 0 ? round($q / $totalOs * 100, 1) : 0.0,
                ])->values()->all(),
            'tempo' => [
                ['chave' => 'geral', 'label' => 'Geral', 'segundos' => $avg($times['geral'])],
                ['chave' => 'desktop', 'label' => 'desktop', 'segundos' => $avg($times['desktop'])],
                ['chave' => 'mobile', 'label' => 'mobile', 'segundos' => $avg($times['mobile'])],
            ],
        ];
    }

    /**
     * Cupons aplicados nos pedidos pagos do período.
     *
     * @return array<int, array{codigo:string,quantidade:int,total:float}>
     */
    public function cuponsAplicados(Builder $paidOrders): array
    {
        return (clone $paidOrders)
            ->whereNotNull('coupon_code')
            ->where('coupon_code', '!=', '')
            ->selectRaw('coupon_code, count(*) as quantidade, sum(amount) as total')
            ->groupBy('coupon_code')
            ->orderByDesc('quantidade')
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'codigo' => (string) $r->coupon_code,
                'quantidade' => (int) $r->quantidade,
                'total' => round((float) $r->total, 2),
            ])
            ->all();
    }

    /**
     * Carrinhos recuperados: sessão que chegou a disparar o aviso de
     * abandono e mesmo assim virou pedido pago.
     *
     * @return array{quantidade:int, total:float}
     */
    public function recuperacoes(Builder $sessions): array
    {
        $rows = (clone $sessions)
            ->whereNotNull('abandoned_webhook_fired_at')
            ->whereNotNull('order_id')
            ->with('order:id,amount,status')
            ->get(['id', 'order_id']);

        $pagos = $rows->filter(fn ($s) => $s->order && in_array($s->order->status, self::STATUS_APPROVED, true));

        return [
            'quantidade' => $pagos->count(),
            'total' => round($pagos->sum(fn ($s) => (float) $s->order->amount), 2),
        ];
    }

    // =====================================================================
    // AUXILIARES
    // =====================================================================

    private function applyRange(Builder $query, mixed $start, mixed $end): void
    {
        if ($start && $end) {
            $query->whereBetween('created_at', [$start, $end]);
        } elseif ($start) {
            $query->where('created_at', '>=', $start);
        } elseif ($end) {
            $query->where('created_at', '<=', $end);
        }
    }

    /** desktop | mobile | tablet — tablet antes de mobile, senão o iPad vira celular. */
    private function deviceFromUserAgent(?string $ua): string
    {
        $ua = (string) $ua;
        if ($ua === '') {
            return 'desktop';
        }
        if (preg_match('/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i', $ua)) {
            return 'tablet';
        }
        if (preg_match('/Mobi|iPhone|iPod|Android|Windows Phone/i', $ua)) {
            return 'mobile';
        }

        return 'desktop';
    }

    /** Ordem importa: "Android" carrega "Linux" no user agent. */
    private function osFromUserAgent(?string $ua): string
    {
        $ua = (string) $ua;

        return match (true) {
            (bool) preg_match('/Windows/i', $ua) => 'Windows',
            (bool) preg_match('/iPhone|iPad|iPod|iOS/i', $ua) => 'iOS',
            (bool) preg_match('/Android/i', $ua) => 'Android',
            (bool) preg_match('/CrOS/i', $ua) => 'Chrome OS',
            (bool) preg_match('/Macintosh|Mac OS X/i', $ua) => 'Macintosh',
            (bool) preg_match('/Linux|X11/i', $ua) => 'Linux',
            default => 'Outros',
        };
    }

    private function ufFromOrder(Order $order): ?string
    {
        $address = $order->shipping_address;
        if (is_string($address)) {
            $address = json_decode($address, true);
        }

        if (is_array($address)) {
            foreach (['state', 'uf', 'address_state'] as $key) {
                $uf = strtoupper(trim((string) ($address[$key] ?? '')));
                if (isset(self::UF_NAME[$uf])) {
                    return $uf;
                }
            }
        }

        $uf = strtoupper(trim((string) ($order->user?->address_state ?? '')));

        return isset(self::UF_NAME[$uf]) ? $uf : null;
    }
}
