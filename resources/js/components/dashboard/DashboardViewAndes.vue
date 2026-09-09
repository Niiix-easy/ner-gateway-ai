<script setup>
/**
 * Dashboard no design system Andes (Mercado Pago).
 *
 * Composição da tela "1 · Início" do guia: o cartão de saldo concentra abas de
 * período, valor, o par de ações, os atalhos e os lançamentos futuros; depois
 * vêm gráfico e funil, e no fim os dois recortes do período (por produto e por
 * meio de pagamento). A lista de últimas vendas saiu de propósito — é a tela de
 * Vendas, e repeti-la aqui fazia as duas telas parecerem a mesma coisa.
 * Aparência e posicionamento ficam em resources/css/dashboard-andes.css.
 */
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import VueApexCharts from 'vue3-apexcharts';
import ConquistasWidget from '@/components/layout/ConquistasWidget.vue';
import DashboardPeriodTabsAndes from '@/components/dashboard/DashboardPeriodTabsAndes.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import { useAppSidebarNav } from '@/composables/useAppSidebarNav';

const props = defineProps({
    title: { type: String, required: true },
    greeting: { type: String, default: '' },
    subtitle: { type: String, required: true },
    hasAchievementsProgress: { type: Boolean, default: false },
    period: { type: String, required: true },
    periodOptions: { type: Array, required: true },
    valuesVisible: { type: Boolean, required: true },
    loading: { type: Boolean, default: false },
    periodLabel: { type: String, default: 'Período' },
    hideValuesLabel: { type: String, default: 'Ocultar valores' },
    showValuesLabel: { type: String, default: 'Mostrar valores' },
    vendas_totais: { type: Number, default: 0 },
    vendas_pendentes: { type: Number, default: 0 },
    quantidade_vendas: { type: Number, default: 0 },
    ticket_medio: { type: Number, default: 0 },
    formas_pagamento: { type: Array, default: () => [] },
    taxa_conversao: { type: Number, default: 0 },
    abandono_carrinho: { type: Number, default: 0 },
    reembolsos_count: { type: Number, default: 0 },
    reembolsos_total: { type: Number, default: 0 },
    quantidade_produtos: { type: Number, default: 0 },
    show_products_metric: { type: Boolean, default: false },
    show_checkout_metrics: { type: Boolean, default: false },
    grafico_vendas: { type: Array, default: () => [] },
    ultimas_vendas: { type: Array, default: () => [] },
    vendas_por_produto: { type: Array, default: () => [] },
    chartOptions: { type: Object, required: true },
    chartSeries: { type: Array, required: true },
    labels: { type: Object, required: true },
    displayCurrency: { type: Function, required: true },
    displayNumber: { type: Function, required: true },
});

const emit = defineEmits(['update:period', 'toggle-values']);

/**
 * Gráfico no padrão do guia: linha de 2,5px em charts-data-loud, grade
 * horizontal de 1px, rótulos de 11px em text-secondary e sem rótulo sobre os
 * pontos. Deriva das opções recebidas, sem afetar os outros templates.
 */
const andesChartOptions = computed(() => {
    const base = props.chartOptions;
    const axisLabelStyle = {
        colors: 'var(--andes-color-text-secondary)',
        fontSize: '11px',
        fontFamily: 'Inter, sans-serif',
    };

    return {
        ...base,
        chart: { ...base.chart, type: 'line' },
        colors: ['var(--andes-charts-color-data-loud)'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
        fill: { type: 'solid', opacity: 0 },
        markers: { size: 0, strokeWidth: 2.5, hover: { size: 5 } },
        grid: {
            ...base.grid,
            borderColor: 'var(--andes-charts-color-gridline)',
            strokeDashArray: 0,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
        },
        xaxis: {
            ...base.xaxis,
            labels: { ...base.xaxis?.labels, style: axisLabelStyle },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            ...base.yaxis,
            labels: { ...base.yaxis?.labels, style: axisLabelStyle },
        },
    };
});

/* Rótulo longo do período, no lugar do "Disponível na conta" da Home do guia. */
function formatLongDate(date) {
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

const periodDisplayLabel = computed(() => {
    const now = new Date();

    if (props.period === 'hoje') {
        return `Hoje, ${formatLongDate(now)}`;
    }

    if (props.period === 'ontem') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return `Ontem, ${formatLongDate(yesterday)}`;
    }

    return props.periodOptions.find((opt) => opt.value === props.period)?.label ?? props.periodLabel;
});

/* Participação de cada meio de pagamento — barra de progresso do guia. */
const paymentTotal = computed(() =>
    props.formas_pagamento.reduce((sum, fp) => sum + (Number(fp.total) || 0), 0),
);

function paymentShare(fp) {
    if (!paymentTotal.value) return 0;

    return Math.round(((Number(fp.total) || 0) / paymentTotal.value) * 100);
}

/* Miniatura circular por meio de pagamento (círculo = meio de pagamento). */
function paymentIcon(metodo) {
    const key = String(metodo ?? '').toLowerCase();

    if (key.includes('pix')) return 'code-scan';
    if (key.includes('boleto')) return 'document-text';
    if (key.includes('card') || key.includes('cart')) return 'card';

    return 'hand-money';
}

/**
 * Atalhos: as próprias entradas do menu, que já vêm filtradas por permissão —
 * nenhum link leva a uma tela que o usuário não pode abrir.
 */
const { navItems } = useAppSidebarNav();

const shortcuts = computed(() =>
    navItems.value
        .filter((item) => item.href && item.href !== '/dashboard')
        .slice(0, 6)
        .map((item) => ({
            name: item.name,
            href: item.href,
            icon: item.icon ?? 'forward',
        })),
);

const canSeeSales = computed(() => navItems.value.some((item) => item.href === '/vendas'));
const canSeeFinance = computed(() => navItems.value.some((item) => item.href === '/financeiro'));
const canSeeReports = computed(() => navItems.value.some((item) => item.href === '/relatorios'));

/* Participação de cada produto no faturamento do período — a barra do guia. */
const rankingTop = computed(() =>
    props.vendas_por_produto.reduce((max, row) => Math.max(max, Number(row.total) || 0), 0),
);

function rankingShare(row) {
    if (!rankingTop.value) return 0;

    return Math.round(((Number(row.total) || 0) / rankingTop.value) * 100);
}
</script>

<template>
    <div class="andes-dash" :aria-busy="loading ? 'true' : 'false'">
        <!-- O painel fala com a pessoa; o selo diz de que recorte é o número -->
        <header class="andes-dash__head andes-dash__greet">
            <div class="andes-dash__greet-row">
                <h1 class="andes-ui-typography tp-heading-huge">{{ greeting || title }}</h1>
                <span class="andes-ui-badge andes-ui-badge--large andes-ui-badge--neutral-quiet">
                    <span class="andes-ui-badge__content">{{ periodDisplayLabel }}</span>
                </span>
            </div>
            <p class="andes-ui-typography tp-body-medium c-secondary">{{ subtitle }}</p>
        </header>

        <div v-if="hasAchievementsProgress" class="andes-dash__achievements">
            <ConquistasWidget variant="dashboard" />
        </div>

        <!-- Cartão de saldo do guia: abas, valor, o par de ações, atalhos e os
             lançamentos futuros — tudo dentro do mesmo cartão -->
        <div class="andes-ui-card andes-ui-card--padding-none andes-dash__hero">
            <DashboardPeriodTabsAndes
                :period="period"
                :period-options="periodOptions"
                :period-label="periodLabel"
                @update:period="emit('update:period', $event)"
            />

            <div class="andes-dash__hero-body">
                <div class="andes-dash__hero-top">
                    <div>
                        <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom:4px">
                            {{ labels.totalSales }}
                        </div>
                        <div class="andes-dash__hero-value">
                            <span v-if="loading" class="andes-ui-skeleton andes-dash__skeleton--value" />
                            <AndesMoney
                                v-else
                                :value="vendas_totais"
                                :visible="valuesVisible"
                                size="xhuge"
                                cents="sups"
                            />
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                                :aria-label="valuesVisible ? hideValuesLabel : showValuesLabel"
                                style="width:32px;height:32px;min-height:32px"
                                @click="emit('toggle-values')"
                            >
                                <AndesIcon :name="valuesVisible ? 'eye' : 'eye-closed'" />
                            </button>
                        </div>
                    </div>

                    <!-- Uma loud por bloco: sacar comanda, o resto é quiet -->
                    <div class="andes-dash__hero-actions">
                        <Link
                            v-if="canSeeFinance"
                            href="/financeiro"
                            class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                        >
                            <AndesIcon name="hand-money" />
                            {{ labels.withdraw }}
                        </Link>
                        <Link
                            v-if="canSeeSales"
                            href="/vendas"
                            class="andes-ui-button andes-ui-button--medium andes-ui-button--quiet"
                        >
                            {{ labels.seeSales }}
                        </Link>
                    </div>
                </div>

                <div v-if="shortcuts.length" class="andes-ui-shortcuts andes-dash__hero-shortcuts">
                    <Link
                        v-for="shortcut in shortcuts"
                        :key="shortcut.href"
                        :href="shortcut.href"
                        class="andes-ui-shortcut"
                    >
                        <span class="andes-ui-shortcut__icon"><AndesIcon :name="shortcut.icon" /></span>
                        <span class="andes-ui-shortcut__label">{{ shortcut.name }}</span>
                    </Link>
                </div>

                <div class="andes-dash__future">
                    <div class="andes-dash__sectionbar">
                        <b class="andes-ui-typography tp-heading-medium">{{ labels.futureEntries }}</b>
                        <Link
                            v-if="canSeeFinance"
                            href="/financeiro"
                            class="andes-ui-textlink andes-ui-textlink--small"
                        >
                            {{ labels.seeAll }}
                            <AndesIcon name="chevron-right" />
                        </Link>
                    </div>
                    <div class="andes-dash__future-stats">
                        <div class="andes-stat">
                            <span>{{ labels.receivable }}</span>
                            <AndesMoney
                                :value="vendas_pendentes"
                                :visible="valuesVisible"
                                size="medium"
                                cents="comma"
                            />
                        </div>
                        <div class="andes-stat">
                            <span>{{ labels.salesCount }}</span>
                            <b class="andes-ui-typography tp-heading-medium">{{ displayNumber(quantidade_vendas) }}</b>
                        </div>
                        <div class="andes-stat">
                            <span>{{ labels.avgTicket }}</span>
                            <AndesMoney
                                :value="ticket_medio"
                                :visible="valuesVisible"
                                size="medium"
                                cents="comma"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Gráfico + métricas do período -->
        <div class="andes-dash__grid andes-dash__grid--2">
            <div class="andes-ui-card andes-ui-card--padding-large">
                <div class="andes-dash__sectionbar">
                    <b class="andes-ui-typography tp-heading-large">{{ labels.salesPerformance }}</b>
                    <Link v-if="canSeeReports" href="/relatorios" class="andes-ui-textlink">
                        {{ labels.seeMetrics }}
                        <AndesIcon name="chevron-right" />
                    </Link>
                </div>
                <div class="andes-dash__chart">
                    <span v-if="loading" class="andes-ui-skeleton andes-dash__skeleton--chart" />
                    <VueApexCharts
                        v-else-if="grafico_vendas.length"
                        type="line"
                        height="260"
                        :options="andesChartOptions"
                        :series="chartSeries"
                    />
                    <p v-else class="andes-ui-typography tp-body-medium andes-dash__chart-empty">
                        {{ labels.noSalesData }}
                    </p>
                </div>
            </div>

            <div class="andes-ui-card andes-ui-card--padding-large andes-dash__stack">
                <div class="andes-stat">
                    <span>{{ labels.conversionRate }}</span>
                    <b class="andes-ui-typography tp-heading-medium">
                        {{ valuesVisible ? `${taxa_conversao}%` : '—' }}
                    </b>
                    <div v-if="valuesVisible && Number(taxa_conversao) > 0" class="andes-progress" role="presentation">
                        <div
                            class="andes-progress__bar"
                            :style="{ width: `${valuesVisible ? Math.min(Number(taxa_conversao) || 0, 100) : 0}%` }"
                        />
                    </div>
                </div>
                <div v-if="show_checkout_metrics" class="andes-stat">
                    <span>{{ labels.cartAbandonment }}</span>
                    <b class="andes-ui-typography tp-heading-medium">{{ displayNumber(abandono_carrinho) }}</b>
                </div>
                <div class="andes-stat">
                    <span>{{ labels.refunds }}</span>
                    <AndesMoney
                        :value="reembolsos_total"
                        :visible="valuesVisible"
                        size="xlarge"
                        cents="comma"
                    />
                    <span class="andes-ui-typography tp-body-small c-secondary">
                        {{ displayNumber(reembolsos_count) }} {{ labels.ordersCount }}
                    </span>
                </div>
                <div v-if="show_products_metric" class="andes-stat">
                    <span>{{ labels.products }}</span>
                    <b class="andes-ui-typography tp-heading-medium">{{ displayNumber(quantidade_produtos) }}</b>
                </div>
            </div>
        </div>

        <!-- Dois recortes do período lado a lado: por produto (quadrado) e por
             meio de pagamento (círculo), como o guia separa objeto de pagamento -->
        <div class="andes-dash__grid andes-dash__grid--even">
            <div class="andes-ui-card andes-ui-card--padding-none">
                <div class="andes-dash__cardhead">
                    <b class="andes-ui-typography tp-heading-medium">{{ labels.topProducts }}</b>
                </div>
                <ul class="andes-ui-list andes-dash__ranklist">
                    <li
                        v-for="produto in vendas_por_produto"
                        :key="produto.id"
                        class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                    >
                        <div class="andes-ui-list__item-content">
                            <span class="andes-ui-thumbnail andes-ui-thumbnail--small andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                                <AndesIcon name="documents" />
                            </span>
                            <span class="andes-dash__list-main">
                                <span class="andes-ui-typography tp-body-small w-emphasis">{{ produto.nome }}</span>
                                <span class="andes-ui-typography tp-body-small c-secondary">
                                    {{ displayNumber(produto.quantidade) }} {{ labels.ordersCount }}
                                </span>
                                <div v-if="valuesVisible && rankingShare(produto) > 0" class="andes-progress" role="presentation">
                                    <div
                                        class="andes-progress__bar"
                                        :style="{ width: `${valuesVisible ? rankingShare(produto) : 0}%` }"
                                    />
                                </div>
                            </span>
                        </div>
                        <AndesMoney
                            :value="produto.total"
                            :visible="valuesVisible"
                            size="small"
                            cents="comma"
                        />
                    </li>
                    <li v-if="!vendas_por_produto.length" class="andes-ui-list__item andes-ui-list__item--size-large andes-ui-list__item--padding-x-small">
                        <span class="andes-ui-typography tp-body-medium c-secondary">{{ labels.noTopProducts }}</span>
                    </li>
                </ul>
            </div>

            <div class="andes-ui-card andes-ui-card--padding-none">
                <div class="andes-dash__cardhead">
                    <b class="andes-ui-typography tp-heading-medium">{{ labels.paymentMethods }}</b>
                </div>
                <ul class="andes-ui-list andes-dash__ranklist">
                    <li
                        v-for="fp in formas_pagamento"
                        :key="fp.metodo"
                        class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                    >
                        <div class="andes-ui-list__item-content">
                            <span class="andes-ui-thumbnail andes-ui-thumbnail--small andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                                <AndesIcon :name="paymentIcon(fp.metodo)" />
                            </span>
                            <span class="andes-dash__list-main">
                                <span class="andes-ui-typography tp-body-small w-emphasis">{{ fp.label }}</span>
                                <span class="andes-ui-typography tp-body-small c-secondary">
                                    {{ valuesVisible ? `${paymentShare(fp)}% ${labels.shareOfPeriod}` : '—' }}
                                </span>
                                <div v-if="valuesVisible && paymentShare(fp) > 0" class="andes-progress" role="presentation">
                                    <div
                                        class="andes-progress__bar"
                                        :style="{ width: `${valuesVisible ? paymentShare(fp) : 0}%` }"
                                    />
                                </div>
                            </span>
                        </div>
                        <AndesMoney
                            :value="fp.total"
                            :visible="valuesVisible"
                            size="small"
                            cents="comma"
                        />
                    </li>
                    <li v-if="!formas_pagamento.length" class="andes-ui-list__item andes-ui-list__item--size-large andes-ui-list__item--padding-x-small">
                        <span class="andes-ui-typography tp-body-medium c-secondary">{{ labels.noPayments }}</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>
