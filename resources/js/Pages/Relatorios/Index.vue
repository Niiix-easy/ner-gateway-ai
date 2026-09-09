<script setup>
/**
 * Relatórios no design system Andes.
 *
 * A ordem e a presença dos blocos seguem a referência mapeada em
 * `/root/design system guide/admin.vegacheckout.com.br-dashboard`: carrossel de
 * banners, abas Faturamento e Marketing, ocultar valores, "Ver dados", período,
 * e daí para baixo os blocos na mesma sequência. A roupa é a nossa — cartão,
 * lista, selo, barra de participação e tipografia do guia do Andes
 * (`resources/css/dashboard-andes.css`, seção "PÁGINA · Relatórios").
 *
 * Os blocos pesados (conversão por estado, origens, comportamento) não vêm no
 * render: chegam por /relatorios/dados quando o vendedor pede "Ver dados",
 * porque varrem pedido a pedido e sessão a sessão do período.
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { router, usePage } from '@inertiajs/vue3';
import VueApexCharts from 'vue3-apexcharts';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { useI18n } from '@/composables/useI18n';

defineOptions({ layout: LayoutInfoprodutor });
const { t } = useI18n();
const page = usePage();
const hasInfoprodutos = computed(() => !!page.props.features?.infoprodutos);

const valuesVisible = ref(true);
const isDarkMode = ref(false);

onMounted(() => {
    isDarkMode.value = document.documentElement.classList.contains('dark');
});

const props = defineProps({
    period: { type: String, default: 'hoje' },
    date_from: { type: String, default: null },
    date_to: { type: String, default: null },
    receita_total: { type: Number, default: 0 },
    quantidade_vendas: { type: Number, default: 0 },
    ticket_medio: { type: Number, default: 0 },
    total_alunos: { type: Number, default: 0 },
    total_produtos: { type: Number, default: 0 },
    formas_pagamento: { type: Array, default: () => [] },
    grafico_receita: { type: Array, default: () => [] },
    receita_por_produto: { type: Array, default: () => [] },
    abandonados_visit: { type: Number, default: 0 },
    abandonados_form: { type: Number, default: 0 },
    abandonados_total: { type: Number, default: 0 },
    taxa_conversao: { type: Number, default: 0 },
    abandonados_com_email: { type: Array, default: () => [] },
    reembolsos_count: { type: Number, default: 0 },
    reembolsos_total: { type: Number, default: 0 },
    total_acessos: { type: Number, default: 0 },
    atualizado_em: { type: String, default: '' },
    /* Faturamento */
    transacoes: { type: Object, default: () => ({ total: 0, linhas: [] }) },
    chargebacks_count: { type: Number, default: 0 },
    chargebacks_total: { type: Number, default: 0 },
    faturamento_por_aparelho: { type: Array, default: () => [] },
    /* Marketing */
    recuperacoes_count: { type: Number, default: 0 },
    recuperacoes_total: { type: Number, default: 0 },
    conversao_por_estado: { type: Array, default: () => [] },
    origens: { type: Object, default: () => ({ utm: [], src: [] }) },
    visitantes: { type: Array, default: () => [] },
    acessos_por_dispositivo: { type: Array, default: () => [] },
    acessos_por_sistema: { type: Array, default: () => [] },
    tempo_checkout: { type: Array, default: () => [] },
    cupons_aplicados: { type: Array, default: () => [] },
    /** Carrossel do topo — Plataforma › Banners Relatórios */
    report_banners: { type: Array, default: () => [] },
});

const periodOptions = [
    { value: 'hoje', label: t('period.today', 'Hoje') },
    { value: 'ontem', label: t('period.yesterday', 'Ontem') },
    { value: '7dias', label: t('period.7days', '7 dias') },
    { value: 'mes', label: t('period.month', 'Mês') },
    { value: 'ano', label: t('period.year', 'Ano') },
    { value: 'total', label: t('period.total', 'Total') },
    { value: 'personalizado', label: t('sales.period.custom', 'Personalizado') },
];

function formatYmd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function defaultDateFrom() {
    const d = new Date();
    d.setDate(1);
    return formatYmd(d);
}

function defaultDateTo() {
    return formatYmd(new Date());
}

const customFrom = ref(props.date_from || '');
const customTo = ref(props.date_to || '');

watch(
    () => [props.period, props.date_from, props.date_to],
    () => {
        if (props.period === 'personalizado') {
            customFrom.value = props.date_from || '';
            customTo.value = props.date_to || '';
        }
    },
);

function setPeriod(value) {
    if (value === 'personalizado') {
        const from = props.date_from || defaultDateFrom();
        const to = props.date_to || defaultDateTo();
        router.get('/relatorios', { period: value, date_from: from, date_to: to }, { preserveState: false });
        return;
    }
    router.get('/relatorios', { period: value }, { preserveState: false });
}

function applyCustomPeriod() {
    router.get(
        '/relatorios',
        {
            period: 'personalizado',
            date_from: customFrom.value || defaultDateFrom(),
            date_to: customTo.value || defaultDateTo(),
        },
        { preserveState: false },
    );
}

const abandonedExportUrl = computed(() => {
    const p = new URLSearchParams({ period: props.period });
    if (props.period === 'personalizado') {
        if (props.date_from) p.set('date_from', props.date_from);
        if (props.date_to) p.set('date_to', props.date_to);
    }
    return `/relatorios/carrinhos-abandonados/export?${p.toString()}`;
});

function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

function displayNumber(value) {
    return valuesVisible.value ? String(value) : '—';
}

function formatDate(iso) {
    if (!iso) return '–';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* Rótulo longo do período, no lugar do "Setembro 2026" do guia. */
const periodDisplayLabel = computed(() => {
    if (props.period === 'personalizado' && props.date_from && props.date_to) {
        const fmt = (iso) => {
            const [y, m, d] = String(iso).split('-');
            return d && m ? `${d}/${m}` : iso;
        };
        return `${fmt(props.date_from)} – ${fmt(props.date_to)}`;
    }

    return periodOptions.find((opt) => opt.value === props.period)?.label ?? props.period;
});

/**
 * Eixos e traço no padrão do guia: linha de 2,5px em charts-data-loud, grade
 * horizontal de 1px, rótulos de 11px em text-secondary e sem rótulo sobre os
 * pontos.
 */
const axisLabelStyle = {
    colors: 'var(--andes-color-text-secondary)',
    fontSize: '11px',
    fontFamily: 'Inter, sans-serif',
};

const chartSeriesReceita = computed(() => [
    {
        name: t('reports.total_revenue', 'Receita total'),
        data: valuesVisible.value ? props.grafico_receita.map((d) => d.total) : props.grafico_receita.map(() => 0),
    },
]);

const chartOptionsReceita = computed(() => ({
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['var(--andes-charts-color-data-loud)'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
    fill: { type: 'solid', opacity: 0 },
    markers: { size: 0, strokeWidth: 2.5, hover: { size: 5 } },
    xaxis: {
        categories: props.grafico_receita.map((d) => {
            const [y, m, day] = (d.data || '').split('-');
            return day && m ? `${day}/${m}` : d.data;
        }),
        labels: { style: axisLabelStyle },
        axisBorder: { show: false },
        axisTicks: { show: false },
    },
    yaxis: { labels: { style: axisLabelStyle, formatter: (v) => formatBRL(v) } },
    grid: {
        borderColor: 'var(--andes-charts-color-gridline)',
        strokeDashArray: 0,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
    },
    tooltip: {
        theme: isDarkMode.value ? 'dark' : 'light',
        y: { formatter: (v) => (valuesVisible.value ? formatBRL(v) : '••••••') },
    },
}));

const chartSeriesProduto = computed(() => [
    {
        name: t('reports.total_revenue', 'Receita total'),
        data: valuesVisible.value ? props.receita_por_produto.map((d) => d.total) : props.receita_por_produto.map(() => 0),
    },
]);

const chartOptionsProduto = computed(() => ({
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['var(--andes-charts-color-data-loud)'],
    dataLabels: { enabled: false },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
    xaxis: {
        categories: props.receita_por_produto.map((d) => (d.product_name || 'Produto').slice(0, 35)),
        labels: { style: axisLabelStyle, formatter: (v) => formatBRL(v) },
        axisBorder: { show: false },
        axisTicks: { show: false },
    },
    yaxis: { labels: { style: axisLabelStyle, maxWidth: 140 } },
    grid: {
        borderColor: 'var(--andes-charts-color-gridline)',
        strokeDashArray: 0,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
    },
    tooltip: {
        theme: isDarkMode.value ? 'dark' : 'light',
        y: { formatter: (v) => (valuesVisible.value ? formatBRL(v) : '••••••') },
    },
}));

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

    if (key.includes('pix')) return 'pix';
    if (key.includes('boleto')) return 'document-text';
    if (key.includes('card') || key.includes('cart')) return 'card';

    return 'hand-money';
}

/* ==========================================================================
   CARROSSEL DE BANNERS — administrado em Plataforma › Banners Relatórios
   ========================================================================== */
const bannerIndex = ref(0);
const isMobileViewport = ref(false);
let bannerTimer = null;

const banners = computed(() => (Array.isArray(props.report_banners) ? props.report_banners : []));

function bannerImage(item) {
    if (isMobileViewport.value) {
        return item.mobile_url || item.desktop_url || '';
    }
    return item.desktop_url || item.mobile_url || '';
}

function stopBannerAutoplay() {
    if (bannerTimer) {
        clearInterval(bannerTimer);
        bannerTimer = null;
    }
}

function startBannerAutoplay() {
    stopBannerAutoplay();
    if (banners.value.length <= 1) return;
    bannerTimer = setInterval(() => {
        bannerIndex.value = (bannerIndex.value + 1) % banners.value.length;
    }, 6000);
}

function bannerPrev() {
    if (!banners.value.length) return;
    bannerIndex.value = (bannerIndex.value - 1 + banners.value.length) % banners.value.length;
    startBannerAutoplay();
}

function bannerNext() {
    if (!banners.value.length) return;
    bannerIndex.value = (bannerIndex.value + 1) % banners.value.length;
    startBannerAutoplay();
}

/* ==========================================================================
   ABAS
   Faturamento e Marketing, como na referência. Os dois chegam prontos do
   servidor: a tela não tem botão de "carregar", porque o vendedor já está
   olhando para os números.
   ========================================================================== */
const TABS = { FATURAMENTO: 'faturamento', MARKETING: 'marketing' };
const currentTab = ref(TABS.FATURAMENTO);

function switchTab(tab) {
    currentTab.value = tab;
}

/* ==========================================================================
   ORIGENS — mesmo bloco, dois recortes (UTM e SRC)
   ========================================================================== */
const originMode = ref('utm');
const originRows = computed(() => props.origens?.[originMode.value] ?? []);

/* ==========================================================================
   FORMATOS
   ========================================================================== */
function displayMoney(value) {
    return valuesVisible.value ? formatBRL(value) : '••••••';
}

function formatPercent(value) {
    if (value === null || value === undefined) return '--';
    return `${String(value).replace('.', ',')}%`;
}

function formatDensity(value) {
    if (value === null || value === undefined) return '--';
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

/** Tempo de checkout: minuto e segundo, que é como a pessoa pensa a espera. */
function formatSeconds(value) {
    if (value === null || value === undefined) return '--';
    const s = Math.max(0, Number(value) || 0);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}min ${String(s % 60).padStart(2, '0')}s`;
}

function deviceIcon(key) {
    if (String(key).includes('mobile')) return 'phone';
    if (String(key).includes('tablet')) return 'tablet';
    return 'monitor';
}

onMounted(() => {
    isMobileViewport.value = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    startBannerAutoplay();
});

onBeforeUnmount(stopBannerAutoplay);
</script>


<template>
    <div class="andes-dash andes-rep">
        <!-- 1 · CARROSSEL DE BANNERS ================================== -->
        <section
            v-if="banners.length"
            class="andes-rep__banners"
            aria-label="Destaques"
            @mouseenter="stopBannerAutoplay"
            @mouseleave="startBannerAutoplay"
        >
            <component
                :is="item.href ? 'a' : 'div'"
                v-for="(item, index) in banners"
                :key="item.id"
                class="andes-rep__banner"
                :class="{ 'is-active': index === bannerIndex }"
                :href="item.href || undefined"
                :target="item.href ? '_blank' : undefined"
                :rel="item.href ? 'noopener noreferrer' : undefined"
                :aria-hidden="index === bannerIndex ? undefined : 'true'"
                :tabindex="index === bannerIndex ? undefined : -1"
            >
                <img :src="bannerImage(item)" :alt="item.title || 'Destaque'" draggable="false" />
            </component>

            <template v-if="banners.length > 1">
                <button type="button" class="andes-rep__banner-nav andes-rep__banner-nav--prev" aria-label="Banner anterior" @click="bannerPrev">
                    <AndesIcon name="chevron-right" style="transform: rotate(180deg)" />
                </button>
                <button type="button" class="andes-rep__banner-nav andes-rep__banner-nav--next" aria-label="Próximo banner" @click="bannerNext">
                    <AndesIcon name="chevron-right" />
                </button>
                <div class="andes-rep__banner-dots">
                    <button
                        v-for="(item, index) in banners"
                        :key="`dot-${item.id}`"
                        type="button"
                        :class="{ 'is-active': index === bannerIndex }"
                        :aria-label="`Ir para o banner ${index + 1}`"
                        @click="bannerIndex = index; startBannerAutoplay()"
                    />
                </div>
            </template>
        </section>

        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">{{ t('sidebar.reports', 'Relatórios') }}</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                Faturamento e marketing do período — {{ periodDisplayLabel }}.
            </p>
        </header>

        <!-- 2 · ABAS ================================================== -->
        <div class="andes-ui-tabs andes-rep__tabs">
            <div class="andes-ui-tabs__tablist" role="tablist" aria-label="Relatórios">
                <button
                    type="button"
                    role="tab"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': currentTab === TABS.FATURAMENTO }"
                    :aria-selected="currentTab === TABS.FATURAMENTO"
                    @click="switchTab(TABS.FATURAMENTO)"
                >
                    <AndesIcon name="hand-money" />
                    Faturamento
                </button>
                <button
                    type="button"
                    role="tab"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': currentTab === TABS.MARKETING }"
                    :aria-selected="currentTab === TABS.MARKETING"
                    @click="switchTab(TABS.MARKETING)"
                >
                    <AndesIcon name="chart-line" />
                    Marketing
                </button>
            </div>
        </div>

        <!-- 3 · PERÍODO: De / Até sempre à vista, e os atalhos ao lado -->
        <div class="andes-rep__toolbar">
            <div class="andes-rep__range">
                <div class="andes-ui-form-control">
                    <label class="andes-ui-form-control__label" for="rep-from">{{ t('common.from', 'De') }}</label>
                    <input id="rep-from" v-model="customFrom" type="date" class="andes-ui-input" :placeholder="'selecione'" @change="applyCustomPeriod" />
                </div>
                <div class="andes-ui-form-control">
                    <label class="andes-ui-form-control__label" for="rep-to">{{ t('common.to', 'Até') }}</label>
                    <input id="rep-to" v-model="customTo" type="date" class="andes-ui-input" :placeholder="'selecione'" @change="applyCustomPeriod" />
                </div>
            </div>

            <div class="andes-rep__filters" role="group" :aria-label="t('dashboard.period', 'Período')">
                <button
                    v-for="opt in periodOptions"
                    :key="opt.value"
                    type="button"
                    class="andes-ui-button andes-ui-button--small"
                    :class="period === opt.value ? 'andes-ui-button--quiet' : 'andes-ui-button--mute'"
                    @click="setPeriod(opt.value)"
                >
                    {{ opt.label }}
                </button>
                <button
                    type="button"
                    class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                    :aria-label="valuesVisible ? 'Ocultar valores' : 'Mostrar valores'"
                    @click="valuesVisible = !valuesVisible"
                >
                    <AndesIcon :name="valuesVisible ? 'eye' : 'eye-closed'" />
                </button>
            </div>
        </div>

        <!-- ============================================================
             ABA FATURAMENTO — mesma ordem da referência:
             indicadores → meios de pagamento → dispositivos → transações
             → mais vendidos
             ============================================================ -->
        <template v-if="currentTab === TABS.FATURAMENTO">
            <div class="andes-ui-card andes-ui-card--padding-huge andes-rep__hero">
                <div class="andes-rep__hero-grid">
                    <div class="andes-rep__kpi andes-rep__kpi--main">
                        <span class="andes-ui-typography tp-body-small c-secondary">Faturamento</span>
                        <AndesMoney :value="receita_total" :hidden="!valuesVisible" size="xhuge" />
                    </div>
                    <div class="andes-rep__kpi">
                        <span class="andes-ui-typography tp-body-small c-secondary">Transações aprovadas</span>
                        <b class="andes-ui-typography tp-heading-huge">{{ displayNumber(quantidade_vendas) }}</b>
                    </div>
                    <div class="andes-rep__kpi">
                        <span class="andes-ui-typography tp-body-small c-secondary">Ticket médio</span>
                        <b class="andes-ui-typography tp-heading-huge">{{ displayMoney(ticket_medio) }}</b>
                    </div>
                    <div class="andes-rep__kpi">
                        <span class="andes-ui-typography tp-body-small c-secondary">Total em chargebacks</span>
                        <b class="andes-ui-typography tp-heading-huge">{{ displayMoney(chargebacks_total) }}</b>
                    </div>
                </div>

                <div class="andes-rep__hero-foot">
                    <a href="/vendas" class="andes-ui-textlink andes-ui-textlink--small">
                        Detalhes
                        <AndesIcon name="chevron-right" />
                    </a>
                    <span class="andes-ui-typography tp-body-small c-secondary">última atualização: {{ atualizado_em }}</span>
                </div>
            </div>

            <!-- Meios de pagamento e Pagamento por dispositivos: lado a lado,
                 um cartão cada, como o `grid md:grid-cols-2` da referência. -->
            <div class="andes-rep__duo">
                <div class="andes-ui-card andes-ui-card--padding-large">
                    <div class="andes-dash__sectionbar">
                        <b class="andes-ui-typography tp-heading-large">Meios de pagamento</b>
                    </div>
                    <ul class="andes-ui-list">
                        <li
                            v-for="fp in formas_pagamento"
                            :key="fp.metodo"
                            class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                        >
                            <div class="andes-ui-list__item-content">
                                <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                                    <AndesIcon :name="paymentIcon(fp.metodo)" />
                                </span>
                                <span class="andes-dash__list-main">
                                    <span class="andes-ui-typography tp-body-medium w-emphasis">{{ fp.label }}</span>
                                    <span class="andes-ui-typography tp-body-small c-secondary">
                                        {{ displayNumber(fp.quantidade) }} {{ t('reports.orders', 'pedido(s)') }}
                                    </span>
                                </span>
                            </div>
                            <span class="andes-dash__list-values andes-rep__pair">
                                <b class="andes-ui-typography tp-heading-medium">{{ formatPercent(fp.participacao) }}</b>
                                <span class="andes-ui-typography tp-body-medium c-secondary">{{ displayMoney(fp.total) }}</span>
                            </span>
                            <span
                                v-if="valuesVisible && fp.participacao > 0"
                                class="andes-rep__rowbar"
                                :style="{ width: `${fp.participacao}%` }"
                                aria-hidden="true"
                            />
                        </li>
                    </ul>
                </div>

                <div class="andes-ui-card andes-ui-card--padding-large">
                    <div class="andes-dash__sectionbar">
                        <b class="andes-ui-typography tp-heading-large">Pagamento por dispositivos</b>
                    </div>
                    <ul class="andes-ui-list">
                        <li
                            v-for="row in faturamento_por_aparelho"
                            :key="row.chave"
                            class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                        >
                            <div class="andes-ui-list__item-content">
                                <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                                    <AndesIcon :name="deviceIcon(row.chave)" />
                                </span>
                                <span class="andes-dash__list-main">
                                    <span class="andes-ui-typography tp-body-medium w-emphasis">{{ row.label }}</span>
                                    <span class="andes-ui-typography tp-body-small c-secondary">
                                        {{ displayNumber(row.quantidade) }} {{ t('reports.orders', 'pedido(s)') }}
                                    </span>
                                </span>
                            </div>
                            <span class="andes-dash__list-values andes-rep__pair">
                                <b class="andes-ui-typography tp-heading-medium">{{ formatPercent(row.participacao) }}</b>
                                <span class="andes-ui-typography tp-body-medium c-secondary">{{ displayMoney(row.total) }}</span>
                            </span>
                            <span
                                v-if="valuesVisible && row.participacao > 0"
                                class="andes-rep__rowbar"
                                :style="{ width: `${row.participacao}%` }"
                                aria-hidden="true"
                            />
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Transações -->
            <div class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">Transações</b>
                <span class="andes-ui-badge andes-ui-badge--large andes-ui-badge--neutral-quiet">
                    <span class="andes-ui-badge__content">{{ displayNumber(transacoes.total) }}</span>
                </span>
            </div>
            <div class="andes-rep__cards">
                <div
                    v-for="row in transacoes.linhas"
                    :key="row.chave"
                    class="andes-ui-card andes-ui-card--padding-large andes-rep__card"
                >
                    <span class="andes-ui-typography tp-body-small c-secondary">{{ row.label }}</span>
                    <b class="andes-ui-typography tp-heading-huge">{{ displayNumber(row.quantidade) }}</b>
                    <span class="andes-ui-typography tp-body-small c-secondary">{{ formatPercent(row.participacao) }} do total</span>
                    <div v-if="valuesVisible && row.participacao > 0" class="andes-progress" role="presentation">
                        <div class="andes-progress__bar" :style="{ width: `${valuesVisible ? row.participacao : 0}%` }" />
                    </div>
                </div>
            </div>

            <!-- Mais vendidos -->
            <div class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">Mais vendidos</b>
            </div>
            <div class="andes-ui-card andes-ui-card--padding-large andes-rep__block">
                <div class="andes-dash__chart">
                    <VueApexCharts
                        v-if="receita_por_produto.length"
                        type="bar"
                        height="320"
                        :options="chartOptionsProduto"
                        :series="chartSeriesProduto"
                    />
                    <p v-else class="andes-ui-typography tp-body-medium andes-dash__chart-empty">Nenhum dado no período</p>
                </div>
            </div>

            <!-- Receita por período — nosso, fora da lista deles, fecha a aba -->
            <div class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">Receita por período</b>
            </div>
            <div class="andes-ui-card andes-ui-card--padding-large andes-rep__block">
                <div class="andes-dash__chart">
                    <VueApexCharts
                        v-if="grafico_receita.length"
                        type="line"
                        height="280"
                        :options="chartOptionsReceita"
                        :series="chartSeriesReceita"
                    />
                    <p v-else class="andes-ui-typography tp-body-medium andes-dash__chart-empty">Nenhum dado no período</p>
                </div>
            </div>
        </template>

        <!-- ============================================================
             ABA MARKETING — indicadores → conversão por estado → origens
             → visitantes → dispositivos → sistema → tempo → cupons
             ============================================================ -->
        <template v-else>
            <div class="andes-ui-card andes-ui-card--padding-huge andes-rep__hero">
                <div class="andes-rep__hero-grid">
                    <div class="andes-rep__kpi">
                        <span class="andes-ui-typography tp-body-small c-secondary">Total de acessos</span>
                        <b class="andes-ui-typography tp-heading-huge">{{ displayNumber(total_acessos) }}</b>
                    </div>
                    <div class="andes-rep__kpi">
                        <span class="andes-ui-typography tp-body-small c-secondary">Taxa de conversão</span>
                        <b class="andes-ui-typography tp-heading-huge">{{ valuesVisible ? formatPercent(taxa_conversao) : '—' }}</b>
                    </div>
                    <div class="andes-rep__kpi">
                        <span class="andes-ui-typography tp-body-small c-secondary">Abandonos de carrinho</span>
                        <b class="andes-ui-typography tp-heading-huge">{{ displayNumber(abandonados_total) }}</b>
                    </div>
                    <div class="andes-rep__kpi">
                        <span class="andes-ui-typography tp-body-small c-secondary">Recuperações</span>
                        <b class="andes-ui-typography tp-heading-huge">{{ displayNumber(recuperacoes_count) }}</b>
                        <span class="andes-ui-typography tp-body-small c-secondary">{{ displayMoney(recuperacoes_total) }}</span>
                    </div>
                </div>

                <div class="andes-rep__hero-foot">
                    <a :href="abandonedExportUrl" class="andes-ui-textlink andes-ui-textlink--small">
                        Detalhes
                        <AndesIcon name="chevron-right" />
                    </a>
                    <span class="andes-ui-typography tp-body-small c-secondary">última atualização: {{ atualizado_em }}</span>
                </div>
            </div>

            <!-- Conversão por estado -->
            <div class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">Conversão por estado</b>
            </div>
            <p class="andes-ui-typography tp-body-small c-secondary andes-rep__hint">
                <b>Densidade:</b> quantidade de vendas para cada 100 mil habitantes.
                <b>Vendas:</b> porcentagem do total de vendas.
            </p>
            <ul class="andes-ui-list andes-dash__list andes-rep__states">
                <li
                    v-for="uf in conversao_por_estado"
                    :key="uf.uf"
                    class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                    :class="{ 'is-empty': !uf.vendas }"
                >
                    <div class="andes-ui-list__item-content">
                        <span class="andes-rep__rank">{{ uf.posicao }}</span>
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--square andes-ui-thumbnail--mute andes-rep__uf">
                            {{ uf.uf }}
                        </span>
                        <span class="andes-dash__list-main">
                            <span class="andes-ui-typography tp-body-medium w-emphasis">{{ uf.nome }}</span>
                        </span>
                    </div>
                    <span class="andes-dash__list-values andes-rep__uf-values">
                        <span class="andes-ui-typography tp-body-small c-secondary">Densidade</span>
                        <b class="andes-ui-typography tp-body-medium">{{ formatDensity(uf.densidade) }}</b>
                    </span>
                    <span class="andes-dash__list-values andes-rep__uf-values">
                        <span class="andes-ui-typography tp-body-small c-secondary">Vendas</span>
                        <b class="andes-ui-typography tp-body-medium">{{ formatPercent(uf.participacao) }}</b>
                    </span>
                </li>
            </ul>

            <!-- Origens -->
            <div class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">Origens</b>
                <div class="andes-rep__switch" role="group" aria-label="Recorte da origem">
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small"
                        :class="originMode === 'utm' ? 'andes-ui-button--quiet' : 'andes-ui-button--mute'"
                        @click="originMode = 'utm'"
                    >
                        UTM
                    </button>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small"
                        :class="originMode === 'src' ? 'andes-ui-button--quiet' : 'andes-ui-button--mute'"
                        @click="originMode = 'src'"
                    >
                        SRC
                    </button>
                </div>
            </div>
            <ul class="andes-ui-list andes-dash__list">
                <li class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-rep__thead">
                    <span class="andes-ui-typography tp-body-small c-secondary">Origem</span>
                    <span class="andes-ui-typography tp-body-small c-secondary andes-rep__col">Vendas</span>
                    <span class="andes-ui-typography tp-body-small c-secondary andes-rep__col">Valor</span>
                </li>
                <li
                    v-for="row in originRows"
                    :key="row.origem"
                    class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                >
                    <div class="andes-ui-list__item-content">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="link" />
                        </span>
                        <span class="andes-dash__list-main">
                            <span class="andes-ui-typography tp-body-medium w-emphasis">{{ row.origem }}</span>
                            <span class="andes-ui-typography tp-body-small c-secondary">{{ displayNumber(row.sessoes) }} acesso(s)</span>
                        </span>
                    </div>
                    <span class="andes-dash__list-values andes-rep__col">
                        <b class="andes-ui-typography tp-body-medium">{{ displayNumber(row.vendas) }}</b>
                    </span>
                    <span class="andes-dash__list-values andes-rep__col">
                        <b class="andes-ui-typography tp-body-medium">{{ displayMoney(row.valor) }}</b>
                    </span>
                </li>
                <li v-if="!originRows.length" class="andes-ui-list__item andes-ui-list__item--size-large">
                    <span class="andes-ui-typography tp-body-medium c-secondary">Nenhuma origem no período</span>
                </li>
            </ul>

            <!-- Visitantes · Dispositivos · Sistema operacional · Tempo -->
            <div class="andes-rep__grid">
                <div class="andes-ui-card andes-ui-card--padding-large">
                    <div class="andes-dash__sectionbar">
                        <b class="andes-ui-typography tp-heading-large">Visitantes</b>
                    </div>
                    <div v-for="row in visitantes" :key="row.chave" class="andes-stat">
                        <span class="andes-ui-typography tp-body-small c-secondary">{{ row.label }}</span>
                        <b class="andes-ui-typography tp-heading-medium">{{ displayNumber(row.quantidade) }}</b>
                        <div v-if="row.chave !== 'anonimos'" class="andes-progress" role="presentation">
                            <div class="andes-progress__bar" :style="{ width: `${valuesVisible ? row.participacao : 0}%` }" />
                        </div>
                    </div>
                </div>

                <div class="andes-ui-card andes-ui-card--padding-large">
                    <div class="andes-dash__sectionbar">
                        <b class="andes-ui-typography tp-heading-large">Por dispositivos</b>
                    </div>
                    <div v-for="row in acessos_por_dispositivo" :key="row.chave" class="andes-stat">
                        <span class="andes-ui-typography tp-body-small c-secondary">{{ row.label }}</span>
                        <b class="andes-ui-typography tp-heading-medium">
                            {{ displayNumber(row.quantidade) }}
                            <span class="andes-ui-typography tp-body-small c-secondary">({{ formatPercent(row.participacao) }})</span>
                        </b>
                        <div v-if="valuesVisible && row.participacao > 0" class="andes-progress" role="presentation">
                            <div class="andes-progress__bar" :style="{ width: `${valuesVisible ? row.participacao : 0}%` }" />
                        </div>
                    </div>
                </div>

                <div class="andes-ui-card andes-ui-card--padding-large">
                    <div class="andes-dash__sectionbar">
                        <b class="andes-ui-typography tp-heading-large">Por sistema operacional</b>
                    </div>
                    <div v-for="row in acessos_por_sistema" :key="row.chave" class="andes-stat">
                        <span class="andes-ui-typography tp-body-small c-secondary">{{ row.label }}</span>
                        <b class="andes-ui-typography tp-heading-medium">
                            {{ displayNumber(row.quantidade) }}
                            <span class="andes-ui-typography tp-body-small c-secondary">({{ formatPercent(row.participacao) }})</span>
                        </b>
                        <div v-if="valuesVisible && row.participacao > 0" class="andes-progress" role="presentation">
                            <div class="andes-progress__bar" :style="{ width: `${valuesVisible ? row.participacao : 0}%` }" />
                        </div>
                    </div>
                </div>

                <div class="andes-ui-card andes-ui-card--padding-large">
                    <div class="andes-dash__sectionbar">
                        <b class="andes-ui-typography tp-heading-large">Tempo médio no checkout</b>
                    </div>
                    <div v-for="row in tempo_checkout" :key="row.chave" class="andes-stat">
                        <span class="andes-ui-typography tp-body-small c-secondary">{{ row.label }}</span>
                        <b class="andes-ui-typography tp-heading-medium">{{ formatSeconds(row.segundos) }}</b>
                    </div>
                    <p class="andes-ui-typography tp-body-small c-secondary andes-rep__hint">
                        Do primeiro campo preenchido até o formulário completo.
                    </p>
                </div>
            </div>

            <!-- Cupons aplicados -->
            <div class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">Cupons aplicados</b>
            </div>
            <ul class="andes-ui-list andes-dash__list">
                <li
                    v-for="cupom in cupons_aplicados"
                    :key="cupom.codigo"
                    class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                >
                    <div class="andes-ui-list__item-content">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="clipboard-check" />
                        </span>
                        <span class="andes-dash__list-main">
                            <span class="andes-ui-typography tp-body-medium w-emphasis andes-rep__code">{{ cupom.codigo }}</span>
                            <span class="andes-ui-typography tp-body-small c-secondary">{{ displayNumber(cupom.quantidade) }} uso(s)</span>
                        </span>
                    </div>
                    <span class="andes-dash__list-values">
                        <b class="andes-ui-typography tp-body-medium">{{ displayMoney(cupom.total) }}</b>
                    </span>
                </li>
                <li v-if="!cupons_aplicados.length" class="andes-ui-list__item andes-ui-list__item--size-large">
                    <span class="andes-ui-typography tp-body-medium c-secondary">Nenhum cupom aplicado no período</span>
                </li>
            </ul>

            <!-- Carrinhos abandonados com e-mail — nosso -->
            <template v-if="hasInfoprodutos">
                <div class="andes-dash__sectionbar">
                    <b class="andes-ui-typography tp-heading-large">Carrinhos abandonados com e-mail</b>
                    <a :href="abandonedExportUrl" class="andes-ui-textlink">
                        <AndesIcon name="download" />
                        {{ t('common.export_csv', 'Exportar CSV') }}
                    </a>
                </div>
                <ul class="andes-ui-list andes-dash__list">
                    <li
                        v-for="row in abandonados_com_email"
                        :key="row.id"
                        class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                    >
                        <div class="andes-ui-list__item-content">
                            <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                                <AndesIcon name="user" />
                            </span>
                            <span class="andes-dash__list-main">
                                <span class="andes-ui-typography tp-body-medium w-emphasis">{{ row.name || row.email }}</span>
                                <span class="andes-ui-typography tp-body-small c-secondary">{{ row.email }} · {{ row.product_name }}</span>
                            </span>
                        </div>
                        <span class="andes-dash__list-values">
                            <span class="andes-ui-typography tp-body-small c-secondary">{{ formatDate(row.updated_at) }}</span>
                        </span>
                    </li>
                    <li v-if="!abandonados_com_email.length" class="andes-ui-list__item andes-ui-list__item--size-large">
                        <span class="andes-ui-typography tp-body-medium c-secondary">Nenhum carrinho abandonado com e-mail no período</span>
                    </li>
                </ul>
            </template>
        </template>
    </div>
</template>
