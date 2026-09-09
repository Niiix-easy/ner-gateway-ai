<script setup>
import { ref, computed, onUnmounted, watch } from 'vue';
import { router, usePage } from '@inertiajs/vue3';
import axios from 'axios';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import VendasTabs from '@/components/vendas/VendasTabs.vue';
import AndesFilterMenu from '@/components/andes/AndesFilterMenu.vue';
import VendaDetailSidebar from '@/components/vendas/VendaDetailSidebar.vue';
import AfiliadoVendaDetailSidebar from '@/components/afiliados/AfiliadoVendaDetailSidebar.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { useI18n } from '@/composables/useI18n';
import { htmlToText } from '@/lib/sanitizeHtml';
import { buildWhatsAppUrl, orderCustomerPhone } from '@/lib/whatsappUrl';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

defineOptions({ layout: LayoutInfoprodutor });
const { t } = useI18n();
const page = usePage();
const hasInfoprodutos = computed(() => !!page.props.features?.infoprodutos);
const hasVitrineAfiliados = computed(() => !!page.props.features?.vitrine_afiliados);


const props = defineProps({
    view: { type: String, default: 'own' },
    has_affiliate_enrollments: { type: Boolean, default: false },
    vendas: { type: Object, default: () => ({ data: [], links: [] }) },
    stats: { type: Object, default: () => ({}) },
    status_filter: { type: String, default: 'todas' },
    filters: { type: Object, default: () => ({}) },
    products: { type: Array, default: () => [] },
    producers: { type: Array, default: () => [] },
    commission_status_options: { type: Array, default: () => [] },
    offers: { type: Array, default: () => [] },
});

const affiliateSidebarOpen = ref(false);
const selectedAffiliateVenda = ref(null);

function openAffiliateDetail(venda) {
    selectedAffiliateVenda.value = venda;
    affiliateSidebarOpen.value = true;
}

function vendaRowKey(v) {
    return v?.list_key ?? String(v?.id ?? '');
}

function openRowDetail(v) {
    if (v?.is_affiliate_commission) {
        openAffiliateDetail(v);
        return;
    }
    openDetail(v);
}

function customerDisplayName(v) {
    if (v?.is_affiliate_commission) {
        if (v.customer_hidden) return 'Oculto';
        return v.customer_name ?? v.customer_email ?? '—';
    }
    return v.user?.name ?? '—';
}

function customerDisplayEmail(v) {
    if (v?.is_affiliate_commission) {
        if (v.customer_hidden) return '—';
        return v.customer_email ?? '—';
    }
    return v.email ?? v.user?.email ?? '—';
}

function rowStatusBadgeLabel(v) {
    if (v?.is_affiliate_commission) {
        return v.status_label ?? v.status ?? '–';
    }
    return statusBadgeLabel(v.status);
}

function rowStatusBadgeClass(v) {
    if (v?.is_affiliate_commission) {
        const map = {
            approved: 'andes-ui-badge--positive-quiet',
            pending: 'andes-ui-badge--caution-quiet',
            cancelled: 'andes-ui-badge--neutral-quiet',
            refunded: 'andes-ui-badge--negative-quiet',
        };
        return map[v.status] ?? 'andes-ui-badge--neutral-quiet';
    }
    return statusBadgeClass(v.status);
}

const valuesVisible = ref(true);
const sidebarOpen = ref(false);
const selectedVenda = ref(null);
const resendingId = ref(null);
const refundingId = ref(null);
const refundModalOpen = ref(false);
const refundTarget = ref(null);
const refundReason = ref('');
const toast = ref({ message: null, type: null });
let toastTimer = null;

const filterOptions = [
    { value: 'aprovadas', label: t('sales.filter.approved', 'Aprovadas') },
    { value: 'med', label: 'MED' },
    { value: 'todas', label: t('sales.filter.all_female', 'Todas') },
];

const periodOptions = [
    { value: 'all', label: t('sales.period.all', 'Todo período') },
    { value: 'today', label: t('period.today', 'Hoje') },
    { value: '7d', label: t('sales.period.last_7_days', 'Últimos 7 dias') },
    { value: '30d', label: t('sales.period.last_30_days', 'Últimos 30 dias') },
    { value: 'this_month', label: t('sales.period.this_month', 'Este mês') },
    { value: 'last_month', label: t('sales.period.last_month', 'Mês passado') },
    { value: 'custom', label: t('sales.period.custom', 'Personalizado') },
];

const paymentMethodOptions = computed(() => {
    const options = [
        { value: 'all', label: t('sales.payment_method.all', 'Todos métodos') },
        { value: 'pix', label: 'PIX' },
    ];
    if (hasInfoprodutos.value) {
        options.push(
            { value: 'card', label: t('sales.payment_method.card', 'Cartão') },
            { value: 'boleto', label: 'Boleto' },
        );
    }
    return options;
});

const paymentStatusOptions = [
    { value: 'all', label: t('sales.status.all', 'Todos status') },
    { value: 'completed', label: t('sales.status.paid', 'Pago') },
    { value: 'pending', label: t('sales.status.pending', 'Pendente') },
    { value: 'disputed', label: 'MED' },
    { value: 'cancelled', label: t('sales.status.cancelled', 'Cancelado') },
    { value: 'refunded', label: t('sales.status.refunded', 'Reembolsado') },
];

function initialProductIds(f) {
    if (Array.isArray(f?.product_ids) && f.product_ids.length) {
        return [...f.product_ids];
    }
    return [];
}

const filterForm = ref({
    q: props.filters?.q ?? '',
    period: props.filters?.period ?? 'all',
    date_from: props.filters?.date_from ?? '',
    date_to: props.filters?.date_to ?? '',
    product_ids: initialProductIds(props.filters),
    offer_id: props.filters?.offer_id ?? '',
    payment_method: props.filters?.payment_method ?? 'all',
    payment_status: props.filters?.payment_status ?? 'all',
    utm_source: props.filters?.utm_source ?? '',
    utm_medium: props.filters?.utm_medium ?? '',
    utm_campaign: props.filters?.utm_campaign ?? '',
    sale_channel: props.filters?.sale_channel ?? '',
    producer_id: props.filters?.producer_id ?? '',
    commission_status: props.filters?.commission_status ?? 'all',
});

const vendasList = computed(() => props.vendas?.data ?? props.vendas ?? []);

const searchFieldFocused = ref(false);
let searchTimer = null;

watch(
    () => props.filters,
    (f) => {
        if (!f) return;
        // Não sobrescrever a busca enquanto o usuário digita (evita perder espaços entre palavras).
        if (!searchFieldFocused.value) {
            filterForm.value.q = f.q ?? '';
        }
        filterForm.value.period = f.period ?? 'all';
        filterForm.value.date_from = f.date_from ?? '';
        filterForm.value.date_to = f.date_to ?? '';
        filterForm.value.product_ids = Array.isArray(f.product_ids) ? [...f.product_ids] : [];
        filterForm.value.offer_id = f.offer_id ?? '';
        filterForm.value.payment_method = f.payment_method ?? 'all';
        filterForm.value.payment_status = f.payment_status ?? 'all';
        filterForm.value.utm_source = f.utm_source ?? '';
        filterForm.value.utm_medium = f.utm_medium ?? '';
        filterForm.value.utm_campaign = f.utm_campaign ?? '';
        filterForm.value.sale_channel = f.sale_channel ?? '';
        filterForm.value.producer_id = f.producer_id ?? '';
        filterForm.value.commission_status = f.commission_status ?? 'all';
    },
    { deep: true },
);

const offersForSelectedProduct = computed(() => {
    const ids = filterForm.value.product_ids ?? [];
    if (!ids.length) return props.offers ?? [];
    const set = new Set(ids.map((x) => String(x)));
    return (props.offers ?? []).filter((o) => set.has(String(o.product_id)));
});

const selectedProductLabels = computed(() => {
    const ids = filterForm.value.product_ids ?? [];
    return (props.products ?? []).filter((p) => ids.some((x) => String(x) === String(p.id))).map((p) => ({ id: p.id, name: p.name }));
});

function buildQuery(overrides = {}) {
    const f = { ...filterForm.value, ...overrides };
    if (typeof f.q === 'string') {
        f.q = f.q.trim();
    }
    const q = { status_filter: props.status_filter, ...f };

    const cleaned = {};
    Object.entries(q).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (Array.isArray(v)) {
            if (v.length === 0) return;
            cleaned[k] = v;
            return;
        }
        if (typeof v === 'string' && v.trim() === '') return;
        if ((k === 'period' || k === 'payment_method' || k === 'payment_status' || k === 'commission_status') && v === 'all') return;
        if (k === 'sale_channel' && (v === '' || v === 'all')) return;
        cleaned[k] = v;
    });
    if (cleaned.period !== 'custom') {
        delete cleaned.date_from;
        delete cleaned.date_to;
    }
    return cleaned;
}

function applyFilters(overrides = {}) {
    router.get('/vendas', buildQuery(overrides), {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
}

function setFilter(value) {
    applyFilters({ status_filter: value });
}

function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

function displayCurrency(value) {
    return valuesVisible.value ? formatBRL(value) : '••••••';
}

function displayNumber(value) {
    return valuesVisible.value ? String(value) : '—';
}

function statusBadgeClass(status) {
    const map = {
        completed: 'andes-ui-badge--positive-quiet',
        pending: 'andes-ui-badge--caution-quiet',
        disputed: 'andes-ui-badge--caution-quiet',
        cancelled: 'andes-ui-badge--neutral-quiet',
        refunded: 'andes-ui-badge--negative-quiet',
    };
    return map[status] ?? 'andes-ui-badge--neutral-quiet';
}

function statusBadgeLabel(status) {
    const map = {
        completed: t('sales.status.paid', 'Pago'),
        pending: t('sales.status.pending', 'Pendente'),
        disputed: 'MED',
        cancelled: t('sales.status.cancelled', 'Cancelado'),
        refunded: t('sales.status.refunded', 'Reembolsado'),
    };
    return map[status] ?? status ?? '–';
}

function openDetail(v) {
    selectedVenda.value = v;
    sidebarOpen.value = true;
}

function closeSidebar() {
    sidebarOpen.value = false;
    selectedVenda.value = null;
}

function toggleProductFilter(id) {
    const cur = [...(filterForm.value.product_ids ?? [])];
    const idx = cur.findIndex((x) => String(x) === String(id));
    if (idx >= 0) {
        cur.splice(idx, 1);
    } else {
        cur.push(id);
    }
    filterForm.value.product_ids = cur;
    const offers = !cur.length
        ? (props.offers ?? [])
        : (props.offers ?? []).filter((o) => cur.some((pid) => String(pid) === String(o.product_id)));
    if (filterForm.value.offer_id && !offers.some((o) => String(o.id) === String(filterForm.value.offer_id))) {
        filterForm.value.offer_id = '';
    }
    onFilterChange();
}

function removeProductFilter(id) {
    filterForm.value.product_ids = (filterForm.value.product_ids ?? []).filter((x) => String(x) !== String(id));
    const offers = !filterForm.value.product_ids.length
        ? (props.offers ?? [])
        : (props.offers ?? []).filter((o) =>
              filterForm.value.product_ids.some((pid) => String(pid) === String(o.product_id)),
          );
    if (filterForm.value.offer_id && !offers.some((o) => String(o.id) === String(filterForm.value.offer_id))) {
        filterForm.value.offer_id = '';
    }
    onFilterChange();
}

async function resendEmail(v) {
    if (resendingId.value) return;
    resendingId.value = v.id;
    try {
        const { data } = await axios.post(`/vendas/${v.id}/resend-access-email`);
        if (data.success) {
            showToast(t('sales.toast.email_resent_success', 'E-mail de compra reenviado com sucesso.'), 'success');
        } else {
            showToast(data.message ?? t('sales.toast.email_resent_fail', 'Não foi possível reenviar o e-mail.'), 'error');
        }
    } catch (err) {
        showToast(
            err.response?.data?.message ?? t('sales.toast.email_resent_error', 'Erro ao reenviar e-mail. Tente novamente.'),
            'error'
        );
    } finally {
        resendingId.value = null;
    }
}

function openRefundModal(v) {
    refundTarget.value = v;
    refundReason.value = '';
    refundModalOpen.value = true;
}

function closeRefundModal() {
    refundModalOpen.value = false;
    refundTarget.value = null;
    refundReason.value = '';
}

async function submitRefund() {
    const v = refundTarget.value;
    if (!v || refundingId.value) return;

    const reason = refundReason.value?.trim() ?? '';
    if (reason !== '' && reason.length < 3) {
        showToast(t('sales.refund.reason_min', 'O motivo deve ter pelo menos 3 caracteres.'), 'error');
        return;
    }

    refundingId.value = v.id;
    try {
        const { data } = await axios.post(`/vendas/${v.id}/reembolsar`, {
            reason: reason !== '' ? reason : null,
        });
        if (data.success) {
            closeRefundModal();
            showToast(data.message ?? t('sales.refund.success', 'Pedido reembolsado.'), 'success');
            router.reload({ preserveScroll: true });
        } else {
            showToast(data.message ?? t('sales.refund.fail', 'Não foi possível reembolsar.'), 'error');
        }
    } catch (err) {
        showToast(
            err.response?.data?.message ?? t('sales.refund.error', 'Erro ao reembolsar. Tente novamente.'),
            'error'
        );
    } finally {
        refundingId.value = null;
    }
}

function canShowRefundAction(venda) {
    return venda && ['completed', 'disputed'].includes(venda.status);
}

function whatsappCustomerUrl(venda) {
    return buildWhatsAppUrl(orderCustomerPhone(venda));
}

function showToast(message, type) {
    toast.value = { message, type };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.value = { message: null, type: null };
        toastTimer = null;
    }, 4000);
}

onUnmounted(() => {
    if (toastTimer) clearTimeout(toastTimer);
    if (searchTimer) clearTimeout(searchTimer);
});

function onSearchInput() {
    const q = (filterForm.value.q ?? '').trim();
    if (q !== '' && q.length < 3) {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = null;
        return;
    }
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        applyFilters();
        searchTimer = null;
    }, 600);
}

function onSearchBlur() {
    searchFieldFocused.value = false;
    const serverQ = props.filters?.q ?? '';
    const localTrimmed = (filterForm.value.q ?? '').trim();
    if (serverQ !== localTrimmed) {
        filterForm.value.q = serverQ;
    }
}

function onFilterChange() {
    applyFilters();
}

function clearFilters() {
    filterForm.value = {
        q: '',
        period: 'all',
        date_from: '',
        date_to: '',
        product_ids: [],
        offer_id: '',
        payment_method: 'all',
        payment_status: 'all',
        utm_source: '',
        utm_medium: '',
        utm_campaign: '',
        sale_channel: '',
        producer_id: '',
        commission_status: 'all',
    };
    applyFilters();
}

function buildExportSearchParams(format) {
    const q = buildQuery({ format });
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (Array.isArray(v)) {
            if (!v.length) return;
            v.forEach((id) => params.append('product_ids[]', String(id)));
            return;
        }
        if (typeof v === 'string' && v.trim() === '') return;
        if ((k === 'period' || k === 'payment_method' || k === 'payment_status') && v === 'all') return;
        if (k === 'sale_channel' && (v === '' || v === 'all')) return;
        params.append(k, String(v));
    });
    return params;
}

/* Data curta do guia: "3/set" na lista, "3/set · 12h47" quando cabe. */
function shortDate(value) {
    if (!value) return '–';
    const d = new Date(value);
    const dia = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    return `${dia} · ${hora}`;
}

/* Estado sem carga positiva deixa o valor riscado, como no extrato do guia. */
function amountTone(v) {
    return ['refunded', 'cancelled'].includes(v?.status) ? 'strikethrough' : '';
}

/* Selo na miniatura só quando o estado é negativo (regra da anatomia de lista). */
function rowHasNegativeMark(v) {
    return ['refunded', 'cancelled', 'disputed'].includes(v?.status);
}

const periodLabel = computed(
    () => periodOptions.find((o) => o.value === (filterForm.value.period || 'all'))?.label ?? '',
);

/**
 * Tudo que está filtrando a lista vira ficha removível — hoje só os produtos
 * apareciam, então não dava para saber por que a lista veio curta.
 */
const appliedChips = computed(() => {
    const chips = [];
    const f = filterForm.value;

    if (f.q) {
        chips.push({ key: 'q', label: `"${f.q}"`, clear: () => { f.q = ''; onFilterChange(); } });
    }
    if (f.period && f.period !== 'all') {
        const label = f.period === 'custom' && f.date_from && f.date_to
            ? `${f.date_from} – ${f.date_to}`
            : periodLabel.value;
        chips.push({ key: 'period', label, clear: () => { f.period = 'all'; f.date_from = ''; f.date_to = ''; onFilterChange(); } });
    }
    if (f.payment_method && f.payment_method !== 'all') {
        const label = paymentMethodOptions.value.find((o) => o.value === f.payment_method)?.label ?? f.payment_method;
        chips.push({ key: 'method', label, clear: () => { f.payment_method = 'all'; onFilterChange(); } });
    }
    if (f.payment_status && f.payment_status !== 'all') {
        const label = paymentStatusOptions.find((o) => o.value === f.payment_status)?.label ?? f.payment_status;
        chips.push({ key: 'status', label, clear: () => { f.payment_status = 'all'; onFilterChange(); } });
    }
    selectedProductLabels.value.forEach((p) => {
        chips.push({ key: `product-${p.id}`, label: p.name, clear: () => removeProductFilter(p.id) });
    });
    if (f.offer_id) {
        const offer = (props.offers ?? []).find((o) => String(o.id) === String(f.offer_id));
        chips.push({ key: 'offer', label: offer?.name ?? t('sales.offer', 'Oferta'), clear: () => { f.offer_id = ''; onFilterChange(); } });
    }
    if (f.sale_channel) {
        chips.push({
            key: 'channel',
            label: f.sale_channel === 'api_pix' ? 'API PIX' : 'PixGO',
            clear: () => { f.sale_channel = ''; onFilterChange(); },
        });
    }
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach((k) => {
        if (f[k]) {
            chips.push({ key: k, label: `${k}: ${f[k]}`, clear: () => { f[k] = ''; onFilterChange(); } });
        }
    });
    if (f.producer_id) {
        const producer = (props.producers ?? []).find((x) => String(x.id) === String(f.producer_id));
        chips.push({ key: 'producer', label: producer?.name ?? 'Produtor', clear: () => { f.producer_id = ''; onFilterChange(); } });
    }
    if (f.commission_status && f.commission_status !== 'all') {
        const label = (props.commission_status_options ?? []).find((o) => o.value === f.commission_status)?.label;
        chips.push({ key: 'commission', label: label ?? f.commission_status, clear: () => { f.commission_status = 'all'; onFilterChange(); } });
    }

    return chips;
});

const advancedCount = computed(() => {
    const f = filterForm.value;
    return [f.sale_channel, f.utm_source, f.utm_medium, f.utm_campaign, f.producer_id]
        .filter((v) => v !== '' && v != null).length
        + (f.commission_status && f.commission_status !== 'all' ? 1 : 0);
});

/* Círculo da linha: o canal por onde a venda entrou. */
function rowIcon(v) {
    if (v?.is_affiliate_commission) return 'hand-shake';
    if (v?.is_api_pix || v?.is_pixgo) return 'pix';
    const method = String(v?.payment_method ?? '').toLowerCase();
    if (method.includes('pix')) return 'pix';
    if (method.includes('card') || method.includes('cart')) return 'card';
    if (method.includes('boleto')) return 'document-text';
    return 'hand-money';
}

const exportCsvUrl = computed(() => `/vendas/export?${buildExportSearchParams('csv').toString()}`);

const exportXlsUrl = computed(() => `/vendas/export?${buildExportSearchParams('xls').toString()}`);

/* Rolagem da página trava enquanto o diálogo está aberto. */
useBodyScrollLock(() => refundModalOpen.value);
</script>

<template>
    <div class="andes-dash andes-ven">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">{{ t('sidebar.sales', 'Vendas') }}</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                {{ t('sales.subtitle', 'Acompanhe pedidos, status de pagamento e desempenho comercial.') }}
            </p>
        </header>

        <VendasTabs />

        <!-- Resultado do período: o número que importa primeiro, indicadores embaixo -->
        <div class="andes-ui-card andes-ui-card--padding-huge andes-ven__hero">
            <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 4px">
                {{ t('sales.metrics.net_amount', 'Valor líquido') }}
            </div>
            <div class="andes-dash__hero-value">
                <AndesMoney :value="Number(stats.valor_liquido) || 0" :visible="valuesVisible" size="xhuge" cents="sups" />
                <button
                    type="button"
                    class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                    style="width: 32px; height: 32px; min-height: 32px"
                    :aria-label="valuesVisible ? t('dashboard.hide_values', 'Ocultar valores') : t('dashboard.show_values', 'Mostrar valores')"
                    @click="valuesVisible = !valuesVisible"
                >
                    <AndesIcon :name="valuesVisible ? 'eye' : 'eye-closed'" />
                </button>
            </div>
            <div class="andes-ui-typography tp-body-small c-secondary" style="margin-top: 6px">
                {{ periodLabel }} · {{ displayNumber(stats.vendas_encontradas ?? 0) }}
                {{ Number(stats.vendas_encontradas) === 1 ? t('sales.one_sale', 'venda') : t('sales.many_sales', 'vendas') }}
            </div>

            <div class="andes-dash__hero-stats">
                <div class="andes-stat">
                    <span>{{ t('sales.metrics.pix_sales', 'No PIX') }}</span>
                    <b class="andes-ui-typography tp-heading-medium">{{ displayNumber(stats.vendas_pix ?? 0) }}</b>
                </div>
                <div v-if="hasInfoprodutos" class="andes-stat">
                    <span>{{ t('sales.metrics.card_sales', 'No cartão') }}</span>
                    <b class="andes-ui-typography tp-heading-medium">{{ displayNumber(stats.vendas_cartao ?? 0) }}</b>
                </div>
                <div class="andes-stat">
                    <span>{{ t('sales.filter.label', 'Recorte') }}</span>
                    <b class="andes-ui-typography tp-heading-medium">
                        {{ filterOptions.find((o) => o.value === status_filter)?.label ?? '—' }}
                    </b>
                </div>
            </div>
        </div>

        <!-- Busca -->
        <div class="andes-search andes-ven__search">
            <span class="andes-search__icon"><AndesIcon name="search" /></span>
            <input
                v-model="filterForm.q"
                type="text"
                class="andes-ui-input"
                :placeholder="hasInfoprodutos
                    ? t('sales.search_placeholder', 'Buscar por cliente, e-mail, pedido, produto...')
                    : t('sales.search_placeholder_gateway', 'Buscar por cliente, e-mail, pedido...')"
                @focus="searchFieldFocused = true"
                @blur="onSearchBlur"
                @input="onSearchInput"
            />
            <button
                v-if="filterForm.q"
                type="button"
                class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button andes-search__clear"
                style="width: 32px; height: 32px; min-height: 32px"
                :aria-label="t('sales.clear_search', 'Limpar busca')"
                @click="filterForm.q = ''; onFilterChange()"
            >
                <AndesIcon name="close" />
            </button>
        </div>

        <!-- Uma faixa só de filtros: cada botão mostra o que está valendo -->
        <div class="andes-filterbar">
            <AndesFilterMenu
                :label="t('sales.filter.label', 'Recorte')"
                icon="filters"
                :options="filterOptions"
                :model-value="status_filter"
                neutral-value="todas"
                @change="setFilter"
            />
            <AndesFilterMenu
                v-model="filterForm.period"
                :label="t('dashboard.period', 'Período')"
                icon="calendar"
                :options="periodOptions"
                neutral-value="all"
                @change="onFilterChange"
            />
            <AndesFilterMenu
                v-model="filterForm.payment_method"
                :label="t('sales.method', 'Método')"
                icon="card"
                :options="paymentMethodOptions"
                neutral-value="all"
                @change="onFilterChange"
            />
            <AndesFilterMenu
                v-model="filterForm.payment_status"
                :label="t('sales.status', 'Status')"
                icon="check"
                :options="paymentStatusOptions"
                neutral-value="all"
                @change="onFilterChange"
            />
            <AndesFilterMenu
                v-if="hasInfoprodutos"
                :label="t('sidebar.products', 'Produtos')"
                icon="archive"
                :count="filterForm.product_ids?.length ?? 0"
                width="280px"
            >
                <label v-for="p in products" :key="p.id" class="andes-ui-choice">
                    <input
                        type="checkbox"
                        class="andes-ui-checkbox"
                        :checked="filterForm.product_ids?.some((x) => String(x) === String(p.id))"
                        @change="toggleProductFilter(p.id)"
                    />
                    <span class="andes-ui-typography tp-body-small">{{ p.name }}</span>
                </label>
                <p v-if="!products.length" class="andes-menu__label">{{ t('products.empty', 'Nenhum produto') }}</p>
            </AndesFilterMenu>
            <AndesFilterMenu
                v-if="hasInfoprodutos && offersForSelectedProduct.length"
                v-model="filterForm.offer_id"
                :label="t('sales.offer', 'Oferta')"
                icon="clipboard"
                :options="[{ value: '', label: t('sales.offers.all', 'Todas ofertas') }, ...offersForSelectedProduct.map((o) => ({ value: o.id, label: o.product_name ? `${o.product_name} - ${o.name}` : o.name }))]"
                neutral-value=""
                width="300px"
                @change="onFilterChange"
            />
            <AndesFilterMenu
                :label="t('sales.more_filters', 'Mais filtros')"
                icon="settings"
                :count="advancedCount"
                width="320px"
            >
                <div class="andes-menu__form">
                    <div class="andes-ui-form-control">
                        <label class="andes-ui-form-control__label" for="ven-canal">Canal</label>
                        <select id="ven-canal" v-model="filterForm.sale_channel" class="andes-ui-input" @change="onFilterChange">
                            <option value="">Todos</option>
                            <option value="api_pix">API PIX</option>
                            <option value="pixgo">PixGO</option>
                        </select>
                    </div>
                    <div class="andes-ui-form-control">
                        <label class="andes-ui-form-control__label" for="ven-utm-source">utm_source</label>
                        <input id="ven-utm-source" v-model="filterForm.utm_source" type="text" class="andes-ui-input" @change="onFilterChange" />
                    </div>
                    <div class="andes-ui-form-control">
                        <label class="andes-ui-form-control__label" for="ven-utm-medium">utm_medium</label>
                        <input id="ven-utm-medium" v-model="filterForm.utm_medium" type="text" class="andes-ui-input" @change="onFilterChange" />
                    </div>
                    <div class="andes-ui-form-control">
                        <label class="andes-ui-form-control__label" for="ven-utm-campaign">utm_campaign</label>
                        <input id="ven-utm-campaign" v-model="filterForm.utm_campaign" type="text" class="andes-ui-input" @change="onFilterChange" />
                    </div>
                    <div v-if="hasVitrineAfiliados && has_affiliate_enrollments" class="andes-ui-form-control">
                        <label class="andes-ui-form-control__label" for="ven-producer">Produtor</label>
                        <select id="ven-producer" v-model="filterForm.producer_id" class="andes-ui-input" @change="onFilterChange">
                            <option value="">Todos produtores</option>
                            <option v-for="p in producers" :key="p.id" :value="p.id">{{ p.name }}</option>
                        </select>
                    </div>
                    <div v-if="has_affiliate_enrollments" class="andes-ui-form-control">
                        <label class="andes-ui-form-control__label" for="ven-commission">Status da comissão</label>
                        <select id="ven-commission" v-model="filterForm.commission_status" class="andes-ui-input" @change="onFilterChange">
                            <option v-for="opt in commission_status_options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                        </select>
                    </div>
                </div>
            </AndesFilterMenu>

            <div class="andes-filterbar__end">
                <AndesFilterMenu :label="t('common.export', 'Exportar')" icon="download" align-end width="200px">
                    <a :href="exportCsvUrl" class="andes-menu__item">
                        <AndesIcon name="download" />
                        {{ t('sales.export.csv', 'Exportar CSV') }}
                    </a>
                    <a :href="exportXlsUrl" class="andes-menu__item">
                        <AndesIcon name="download" />
                        {{ t('sales.export.xls', 'Exportar XLS') }}
                    </a>
                </AndesFilterMenu>
            </div>
        </div>

        <!-- Período personalizado: só aparece quando é ele que está valendo -->
        <div v-if="filterForm.period === 'custom'" class="andes-ui-card andes-ui-card--padding-large andes-block--tight">
            <div class="andes-filters" style="margin-bottom: 0">
                <div class="andes-ui-form-control andes-ui-form-control--tight">
                    <label class="andes-ui-form-control__label" for="ven-from">{{ t('common.from', 'De') }}</label>
                    <input id="ven-from" v-model="filterForm.date_from" type="date" class="andes-ui-input" @change="onFilterChange" />
                </div>
                <div class="andes-ui-form-control andes-ui-form-control--tight">
                    <label class="andes-ui-form-control__label" for="ven-to">{{ t('common.to', 'Até') }}</label>
                    <input id="ven-to" v-model="filterForm.date_to" type="date" class="andes-ui-input" @change="onFilterChange" />
                </div>
            </div>
        </div>

        <!-- O que está filtrando, em fichas removíveis -->
        <div v-if="appliedChips.length" class="andes-chips">
            <span v-for="chip in appliedChips" :key="chip.key" class="andes-chip">
                <span :title="chip.label">{{ chip.label }}</span>
                <button type="button" :aria-label="`${t('common.remove', 'Remover')} ${chip.label}`" @click="chip.clear()">
                    <AndesIcon name="close" />
                </button>
            </span>
            <button type="button" class="andes-ui-textlink andes-ui-textlink--small" @click="clearFilters">
                {{ t('sales.clear_filters', 'Limpar filtros') }}
            </button>
        </div>

        <!-- Lista: miniatura · conteúdo · valor · chevron -->
        <ul v-if="vendasList.length" class="andes-ui-list andes-dash__list">
            <li
                v-for="v in vendasList"
                :key="vendaRowKey(v)"
                class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                role="button"
                tabindex="0"
                @click="openRowDetail(v)"
                @keydown.enter.prevent="openRowDetail(v)"
            >
                <div class="andes-ui-list__item-content">
                    <span class="andes-thumb">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon :name="rowIcon(v)" />
                        </span>
                        <span
                            v-if="rowHasNegativeMark(v)"
                            class="andes-ui-badge andes-ui-badge--small andes-ui-badge--negative andes-thumb__mark"
                            aria-hidden="true"
                        />
                    </span>
                    <span class="andes-dash__list-main">
                        <span class="andes-ui-typography tp-body-medium w-emphasis">
                            {{ v.product_display_name ?? v.product?.name ?? '–' }}
                        </span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ customerDisplayName(v) }} · {{ customerDisplayEmail(v) }}
                        </span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ rowStatusBadgeLabel(v) }} · {{ shortDate(v.created_at) }} · {{ v.gateway_label ?? '–' }}
                            <template v-if="v.is_api_pix"> · API PIX</template>
                            <template v-else-if="v.is_pixgo"> · {{ v.sale_channel_label || 'PixGO' }}</template>
                            <template v-else-if="v.is_affiliate_commission"> · Afiliados</template>
                        </span>
                    </span>
                </div>
                <span class="andes-dash__list-values">
                    <AndesMoney
                        :value="Number(v.amount_net ?? v.amount_total ?? v.amount) || 0"
                        :visible="valuesVisible"
                        :tone="amountTone(v)"
                        size="medium"
                        cents="comma"
                    />
                    <span class="andes-ui-list__item-chevron"><AndesIcon name="chevron-right" /></span>
                </span>
            </li>
        </ul>

        <div v-else class="andes-ui-card andes-ui-card--padding-large">
            <div class="andes-empty">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="hand-money" />
                </span>
                <b class="andes-ui-typography tp-heading-medium">{{ t('sales.empty', 'Nenhuma venda encontrada.') }}</b>
                <span class="andes-ui-typography tp-body-small c-secondary">
                    {{ appliedChips.length
                        ? t('sales.empty_filtered', 'Nenhum pedido bate com esses filtros no período escolhido.')
                        : t('sales.empty_hint', 'Assim que a primeira venda entrar, ela aparece aqui.') }}
                </span>
                <button
                    v-if="appliedChips.length"
                    type="button"
                    class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                    style="margin-top: 12px"
                    @click="clearFilters"
                >
                    {{ t('sales.clear_filters', 'Limpar filtros') }}
                </button>
            </div>
        </div>

        <nav v-if="vendas?.links?.length > 3" class="andes-pagination" :aria-label="t('common.pagination', 'Paginação')">
            <a
                v-for="link in vendas.links"
                :key="link.label"
                :href="link.url"
                :aria-current="link.active ? 'page' : undefined"
                :aria-disabled="!link.url"
                class="andes-pagination__item"
                :class="[link.active && 'andes-pagination__item--active', !link.url && 'andes-pagination__item--disabled']"
                v-text="htmlToText(link.label)"
                @click.prevent="link.url && router.visit(link.url, { preserveState: true })"
            />
        </nav>

        <!-- As ações da venda moram na gaveta, junto do contexto -->
        <VendaDetailSidebar
            :open="sidebarOpen"
            :venda="selectedVenda"
            :resending="resendingId != null && resendingId === selectedVenda?.id"
            :whatsapp-url="selectedVenda ? whatsappCustomerUrl(selectedVenda) : ''"
            :can-refund="canShowRefundAction(selectedVenda)"
            @close="closeSidebar"
            @resend="resendEmail(selectedVenda)"
            @refund="openRefundModal(selectedVenda)"
        />

        <AfiliadoVendaDetailSidebar
            :open="affiliateSidebarOpen"
            :venda="selectedAffiliateVenda"
            @close="affiliateSidebarOpen = false"
        />

        <Teleport to="body">
            <!-- Reembolso -->
            <div
                v-if="refundModalOpen"
                class="andes-dash andes-modal"
                style="z-index: 100002"
                role="dialog"
                aria-modal="true"
                aria-labelledby="refund-modal-title"
            >
                <div class="andes-modal__veil" @click="closeRefundModal" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card">
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="import" />
                        </span>
                        <b id="refund-modal-title" class="andes-ui-typography tp-heading-large">
                            {{ t('sales.refund_manual', 'Reembolsar') }}
                        </b>
                    </div>
                    <p class="andes-ui-typography tp-body-medium c-secondary" style="margin-bottom: 16px">
                        O pedido será marcado como <b class="w-emphasis">Reembolsado</b>. Se houver saldo creditado na sua carteira,
                        o valor líquido será debitado.
                    </p>
                    <div class="andes-form andes-form--wide">
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="refund-reason">
                                {{ t('sales.refund.reason_optional', 'Motivo (opcional)') }}
                            </label>
                            <textarea
                                id="refund-reason"
                                v-model="refundReason"
                                rows="3"
                                maxlength="500"
                                class="andes-ui-input"
                                :placeholder="t('sales.refund.reason_placeholder', 'Ex.: cliente solicitou por WhatsApp')"
                            />
                        </div>
                        <div class="andes-actions">
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--medium andes-ui-button--mute"
                                :disabled="refundingId != null"
                                @click="closeRefundModal"
                            >
                                {{ t('common.cancel', 'Cancelar') }}
                            </button>
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--medium andes-ui-button--loud andes-ui-button--danger"
                                :disabled="refundingId != null"
                                @click="submitRefund"
                            >
                                {{ refundingId ? t('common.processing', 'Processando...') : t('sales.refund.confirm', 'Confirmar reembolso') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Aviso -->
            <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="translate-y-2 opacity-0"
                enter-to-class="translate-y-0 opacity-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="translate-y-0 opacity-100"
                leave-to-class="translate-y-2 opacity-0"
            >
                <div v-if="toast.message" class="andes-dash andes-scope--bare andes-toast" role="alert">
                    <div
                        class="andes-ui-message"
                        :class="toast.type === 'error' ? 'andes-ui-message--negative' : 'andes-ui-message--positive'"
                    >
                        <span class="andes-ui-message__text">{{ toast.message }}</span>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>
