<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useForm, usePage, Link } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import { useI18n } from '@/composables/useI18n';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import KycDocumentsForm from '@/components/kyc/KycDocumentsForm.vue';
import KycOnboardingModal from '@/components/kyc/KycOnboardingModal.vue';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

defineOptions({ layout: LayoutInfoprodutor });

const page = usePage();
const { t } = useI18n();

const props = defineProps({
    wallet: { type: Object, default: null },
    withdrawals: { type: Array, default: () => [] },
    fee_preview: { type: Object, default: () => ({}) },
    payout_settings: { type: Object, default: () => ({}) },
    payout_pix_setup: { type: String, default: null },
    /** Dígitos do documento do titular (KYC) para pré-preencher CajuPay */
    caju_pix_owner_document_hint: { type: String, default: '' },
    settlement_preview: { type: Object, default: () => ({}) },
    pending_receive_by_date: { type: Array, default: () => [] },
    seller_profile: {
        type: Object,
        default: () => ({ name: '', email: '', document: null }),
    },
    kyc_finance_locked: { type: Boolean, default: false },
    kyc_status: { type: String, default: null },
    kyc_person_type: { type: String, default: 'pf' },
    kyc_rejection_reason: { type: String, default: null },
    /** Dados do cadastro inicial (somente leitura). */
    registration_snapshot: {
        type: Object,
        default: () => ({}),
    },
});

function snap(v) {
    if (v === null || v === undefined || v === '') {
        return '—';
    }
    return v;
}

const needsKycUpload = computed(() => {
    const status = props.kyc_status || 'not_submitted';
    return status === 'not_submitted' || status === 'rejected';
});

const showKycOnboardingModal = computed(() => needsKycUpload.value);

function readTabFromUrl() {
    if (typeof window === 'undefined') {
        return 'extrato';
    }
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'seus-dados' || t === 'dados' || t === 'extrato') {
        return t;
    }
    return 'extrato';
}

const activeTab = ref('extrato');

function setFinanceTab(tab) {
    activeTab.value = tab;
    if (typeof window === 'undefined') {
        return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
}

onMounted(() => {
    activeTab.value = needsKycUpload.value ? 'seus-dados' : readTabFromUrl();
    if (needsKycUpload.value) {
        setFinanceTab('seus-dados');
    }
});
const showWithdrawModal = ref(false);
/** Só após cadastro: mostra dados em leitura; Editar habilita o formulário. */
const editingPayoutPix = ref(false);

const withdrawForm = useForm({
    amount: '',
    bucket: 'pix',
    notes: '',
});

const payoutPixForm = useForm({
    label: '',
    pix_key_type: 'cpf',
    pix_key: '',
    /** CPF ou CNPJ do titular da chave — obrigatório CajuPay. Apenas dígitos ao enviar. */
    key_owner_document: '',
    receiver_name: '',
    receiver_document: '',
    receiver_email: '',
});

function openWithdrawModal() {
    showWithdrawModal.value = true;
}

function closeWithdrawModal() {
    showWithdrawModal.value = false;
}

function goRegisterPayoutPix() {
    closeWithdrawModal();
    setFinanceTab('dados');
    if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
            document.getElementById('payout-pix-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

function submitPayoutPix() {
    payoutPixForm.clearErrors();
    const onSuccess = () => {
        payoutPixForm.clearErrors();
        editingPayoutPix.value = false;
        if (props.payout_pix_setup === 'label_and_key') {
            payoutPixForm.reset('pix_key');
            payoutPixForm.reset('key_owner_document');
        }
    };
    if (props.payout_pix_setup === 'label_and_key') {
        payoutPixForm
            .transform((data) => ({
                label: data.label,
                pix_key_type: data.pix_key_type,
                pix_key: data.pix_key,
                key_owner_document: data.key_owner_document,
            }))
            .post('/financeiro/pix-saque', {
                preserveScroll: true,
                onSuccess,
            });
        return;
    }
    if (props.payout_pix_setup === 'key_and_receiver') {
        payoutPixForm
            .transform((data) => ({
                pix_key: data.pix_key,
                pix_key_type: data.pix_key_type,
                receiver_name: data.receiver_name,
                receiver_document: data.receiver_document,
                receiver_email: data.receiver_email,
            }))
            .post('/financeiro/pix-saque', {
                preserveScroll: true,
                onSuccess,
            });
        return;
    }
    if (props.payout_pix_setup === 'pix_key_only') {
        payoutPixForm
            .transform((data) => ({
                pix_key: data.pix_key,
                pix_key_type: data.pix_key_type,
            }))
            .post('/financeiro/pix-saque', {
                preserveScroll: true,
                onSuccess,
            });
    }
}

function syncPayoutPixFormFromProps() {
    const s = props.payout_settings || {};
    if (props.payout_pix_setup === 'label_and_key') {
        payoutPixForm.label = (s.payout_pix_label || s.cajupay_pix_label || '').trim();
        payoutPixForm.pix_key = (s.cajupay_pix_key || '').trim();
        payoutPixForm.pix_key_type = s.cajupay_pix_key_type || s.payout_pix_key_type || 'cpf';
        const savedDoc = (s.cajupay_pix_key_owner_document || '').replace(/\D/g, '');
        payoutPixForm.key_owner_document = savedDoc || (props.caju_pix_owner_document_hint || '').replace(/\D/g, '') || '';
    } else if (props.payout_pix_setup === 'key_and_receiver') {
        payoutPixForm.pix_key = (s.payout_pix_key || s.spacepag_pix_key || '').trim();
        payoutPixForm.pix_key_type = s.payout_pix_key_type || s.spacepag_pix_key_type || 'cpf';
        payoutPixForm.receiver_name = (s.receiver_name || '').trim();
        payoutPixForm.receiver_document = (s.receiver_document || '').trim();
        payoutPixForm.receiver_email = (s.receiver_email || '').trim();
    } else if (props.payout_pix_setup === 'pix_key_only') {
        payoutPixForm.pix_key = (s.payout_pix_key || s.woovi_pix_key || '').trim();
        payoutPixForm.pix_key_type = s.payout_pix_key_type || s.woovi_pix_key_type || 'cpf';
    }
}

function startEditPayoutPix() {
    editingPayoutPix.value = true;
    syncPayoutPixFormFromProps();
}

function cancelEditPayoutPix() {
    editingPayoutPix.value = false;
    syncPayoutPixFormFromProps();
    payoutPixForm.clearErrors();
}

function submitWithdraw() {
    withdrawForm.post('/financeiro/saque', {
        preserveScroll: true,
        onSuccess: () => {
            withdrawForm.reset('amount', 'notes');
            withdrawForm.clearErrors();
            showWithdrawModal.value = false;
        },
    });
}

function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function formatPercent(value) {
    const n = Number(value) || 0;
    return `${n.toLocaleString('pt-BR', {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2,
    })}%`;
}

function bucketLabel(b) {
    const map = { pix: 'PIX', card: 'Cartão', boleto: 'Boleto' };
    return map[b] || b || '—';
}

function statusLabel(s) {
    const map = {
        pending: 'Pendente',
        paid: 'Pago',
        rejected: 'Rejeitado',
    };
    return map[s] || s || '—';
}

const role = computed(() => page.props.auth?.user?.role);
const canRequestWithdrawal = computed(() => role.value === 'infoprodutor');

const kycFinanceLocked = computed(() => props.kyc_finance_locked === true);

const withdrawalFeeHint = computed(() => {
    const w = props.fee_preview?.withdrawal;
    if (!w) return '';
    return `Taxa de saque efetiva: ${w.percent ?? 0}% + ${formatBRL(w.fixed ?? 0)} sobre o valor solicitado.`;
});

const payoutPixLabelDisplay = computed(() => {
    const s = props.payout_settings || {};
    return (s.payout_pix_label || s.cajupay_pix_label || '').trim() || '—';
});

const payoutPixKeyDisplay = computed(() => {
    const s = props.payout_settings || {};
    return (s.payout_pix_key || s.spacepag_pix_key || s.woovi_pix_key || '').trim() || '';
});

function pixKeyTypeLabel(t) {
    const m = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', phone: 'Telefone', evp: 'Chave aleatória' };
    return m[t] || t || '—';
}

const payoutPixTypeDisplay = computed(() => {
    const s = props.payout_settings || {};
    const t = s.payout_pix_key_type || s.spacepag_pix_key_type || s.woovi_pix_key_type || 'cpf';
    return pixKeyTypeLabel(t);
});

const hasReservePending = computed(() => (Number(props.wallet?.reserve_pending_total) || 0) > 0.0001);

const pendingReceiveByDate = computed(() =>
    (props.pending_receive_by_date ?? []).filter((row) => (Number(row.amount) || 0) > 0)
);

function formatPendingReleaseDate(isoDate) {
    if (!isoDate) {
        return t('finance.pending_date_unknown', 'Data a confirmar');
    }
    const [y, m, d] = String(isoDate).split('-');
    if (!y || !m || !d) {
        return isoDate;
    }
    return `${d}/${m}/${y}`;
}

const settlementCards = computed(() => {
    const fees = props.fee_preview || {};
    const sp = props.settlement_preview || {};
    const rows = [
        { key: 'pix', label: 'PIX', accent: 'from-sky-500/20 to-cyan-500/10 text-sky-700 dark:text-sky-300' },
        { key: 'card', label: 'Cartão', accent: 'from-violet-500/20 to-purple-500/10 text-violet-700 dark:text-violet-300' },
        { key: 'apple_pay', label: 'Apple Pay', accent: 'from-zinc-400/25 to-zinc-500/15 text-zinc-800 dark:text-zinc-200' },
        { key: 'google_pay', label: 'Google Pay', accent: 'from-blue-500/15 to-indigo-500/10 text-indigo-800 dark:text-indigo-200' },
        { key: 'boleto', label: 'Boleto', accent: 'from-emerald-500/20 to-teal-500/10 text-emerald-700 dark:text-emerald-300' },
    ];
    return rows
        .map(({ key, label, accent }) => {
            const r = sp[key];
            const f = fees[key];
            if (!r || typeof r !== 'object') return null;
            const days = Number(r.days_to_available) || 0;
            const percent = Number(f?.percent) || 0;
            const fixed = Number(f?.fixed) || 0;
            return {
                label,
                accent,
                percent,
                fixed,
                days,
                payoutText: `D+${days}`,
            };
        })
        .filter(Boolean);
});

const hasPayoutPixRegistered = computed(() => {
    const s = props.payout_settings || {};
    if (props.payout_pix_setup === 'label_and_key') {
        return !!(s.cajupay_pix_key_id || s.cajupay_pix_key);
    }
    if (props.payout_pix_setup === 'key_and_receiver' || props.payout_pix_setup === 'pix_key_only') {
        const k = (s.payout_pix_key || s.spacepag_pix_key || s.woovi_pix_key || '').trim();
        return k !== '';
    }
    return false;
});

const hasExtratoContent = computed(() => (props.withdrawals?.length || 0) > 0);

watch(
    () => [props.payout_pix_setup, props.payout_settings, props.caju_pix_owner_document_hint],
    () => {
        syncPayoutPixFormFromProps();
    },
    { immediate: true }
);

function maskCpfCnpjDigits(digits) {
    const d = String(digits || '').replace(/\D/g, '');
    if (d.length === 11) {
        return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (d.length === 14) {
        return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return digits || '—';
}

/* Sigilo do saldo (olho do guia). Vale só para esta visita à página. */
const valuesVisible = ref(true);

function toggleValues() {
    valuesVisible.value = !valuesVisible.value;
}

/* "Conferir" abre as datas de liberação dentro do próprio cartão. */
const showFutureDates = ref(false);

/* Círculo = meio de pagamento, como na lista de atividade do guia. */
function bucketIcon(bucket) {
    const map = { pix: 'pix', card: 'card', boleto: 'document-text' };
    return map[bucket] || 'wallet';
}

/* Selo de status: vermelho só para recusa, como manda o guia. */
function statusBadgeClass(status) {
    const map = {
        paid: 'andes-ui-badge--positive-quiet',
        rejected: 'andes-ui-badge--negative-quiet',
        pending: 'andes-ui-badge--caution-quiet',
    };
    return map[status] || 'andes-ui-badge--neutral-quiet';
}

function withdrawDateLabel(value) {
    return value ? new Date(value).toLocaleString('pt-BR') : '—';
}

/**
 * Barras de fluxo do guia para o saldo disponível por meio de pagamento:
 * a maior fatia ocupa a altura cheia e as outras acompanham a proporção.
 */
const methodBars = computed(() => {
    const rows = [
        { key: 'pix', label: 'PIX', value: Number(props.wallet?.available_pix) || 0 },
        { key: 'card', label: 'Cartão', value: Number(props.wallet?.available_card) || 0 },
        { key: 'boleto', label: 'Boleto', value: Number(props.wallet?.available_boleto) || 0 },
    ];
    const top = Math.max(...rows.map((r) => r.value), 0);

    return rows.map((row) => ({
        ...row,
        height: top > 0 ? Math.max(Math.round((row.value / top) * 88), 4) : 4,
        leading: top > 0 && row.value === top,
    }));
});

/* Rolagem da página trava enquanto o diálogo está aberto. */
useBodyScrollLock(() => showWithdrawModal.value);
</script>

<template>
    <div class="andes-dash andes-fin">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">{{ t('sidebar.finance', 'Financeiro') }}</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                {{ t('finance.subtitle', 'Saldos, extrato e dados para recebimento.') }}
            </p>
        </header>

        <div v-if="page.props.flash?.success" class="andes-ui-message andes-ui-message--positive andes-fin__block">
            <span class="andes-ui-message__text">{{ page.props.flash.success }}</span>
        </div>
        <div v-if="page.props.flash?.error" class="andes-ui-message andes-ui-message--negative andes-fin__block">
            <span class="andes-ui-message__text">{{ page.props.flash.error }}</span>
        </div>

        <template v-if="wallet">
            <!-- Retido: uma linha acima do saldo, como o "Retido" do guia -->
            <div v-if="hasReservePending" class="andes-ui-card andes-ui-card--padding-large andes-fin__retained">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--small andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="shield" />
                </span>
                <span class="andes-ui-typography tp-body-medium c-secondary">
                    {{ t('finance.reserve', 'Reserva financeira') }}
                </span>
                <AndesMoney :value="Number(wallet.reserve_pending_total) || 0" :visible="valuesVisible" size="large" cents="comma" />
            </div>

            <!-- Cartão do saldo disponível: valor, atalhos e lançamentos futuros -->
            <div class="andes-ui-card andes-ui-card--padding-huge andes-fin__hero">
                <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 6px">
                    {{ t('finance.available_balance', 'Saldo disponível') }}
                </div>
                <div class="andes-fin__hero-value">
                    <AndesMoney :value="Number(wallet.available_total) || 0" :visible="valuesVisible" size="xhuge" cents="sups" />
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                        :aria-label="valuesVisible ? t('common.hide', 'Ocultar') : t('common.view', 'Ver')"
                        style="width: 32px; height: 32px; min-height: 32px"
                        @click="toggleValues"
                    >
                        <AndesIcon :name="valuesVisible ? 'eye' : 'eye-closed'" />
                    </button>
                </div>

                <div v-if="canRequestWithdrawal && !kycFinanceLocked" class="andes-ui-shortcuts">
                    <button type="button" class="andes-ui-shortcut" @click="openWithdrawModal">
                        <span class="andes-ui-shortcut__icon"><AndesIcon name="export" /></span>
                        <span class="andes-ui-shortcut__label">{{ t('finance.request_withdrawal', 'Solicitar saque') }}</span>
                    </button>
                    <button v-if="payout_pix_setup" type="button" class="andes-ui-shortcut" @click="setFinanceTab('dados')">
                        <span class="andes-ui-shortcut__icon"><AndesIcon name="key" /></span>
                        <span class="andes-ui-shortcut__label">{{ t('finance.bank_details', 'Dados bancários') }}</span>
                    </button>
                </div>

                <div class="andes-fin__future">
                    <div class="andes-fin__future-head">
                        <b class="andes-ui-typography tp-heading-medium">
                            {{ t('finance.future_entries', 'Lançamentos futuros') }}
                        </b>
                        <button
                            v-if="pendingReceiveByDate.length"
                            type="button"
                            class="andes-ui-textlink"
                            :aria-expanded="showFutureDates ? 'true' : 'false'"
                            @click="showFutureDates = !showFutureDates"
                        >
                            {{ showFutureDates ? t('common.hide', 'Ocultar') : t('common.check', 'Conferir') }}
                            <AndesIcon :name="showFutureDates ? 'chevron-down' : 'chevron-right'" />
                        </button>
                    </div>

                    <div class="andes-fin__stats">
                        <div class="andes-stat">
                            <span>{{ t('finance.pending_receive', 'A receber') }}</span>
                            <AndesMoney :value="Number(wallet.pending_total) || 0" :visible="valuesVisible" size="medium" cents="comma" />
                        </div>
                        <div class="andes-stat">
                            <span>{{ t('finance.reserve', 'Reserva financeira') }}</span>
                            <AndesMoney :value="Number(wallet.reserve_pending_total) || 0" :visible="valuesVisible" size="medium" cents="comma" />
                        </div>
                        <div class="andes-stat">
                            <span>{{ t('finance.withdrawn', 'Saques solicitados') }}</span>
                            <b class="andes-ui-typography tp-heading-medium">{{ withdrawals.length }}</b>
                        </div>
                    </div>

                    <ul v-if="showFutureDates" class="andes-ui-list andes-fin__dates">
                        <li
                            v-for="(row, idx) in pendingReceiveByDate"
                            :key="row.date ?? `unknown-${idx}`"
                            class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                        >
                            <span class="andes-ui-typography tp-body-small c-secondary">{{ formatPendingReleaseDate(row.date) }}</span>
                            <AndesMoney :value="Number(row.amount) || 0" :visible="valuesVisible" size="small" cents="comma" />
                        </li>
                    </ul>
                </div>
            </div>
        </template>

        <!-- Abas da página -->
        <div class="andes-ui-tabs andes-fin__tabs">
            <div class="andes-ui-tabs__tablist" role="tablist" :aria-label="t('sidebar.finance', 'Financeiro')">
                <button
                    type="button"
                    role="tab"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': activeTab === 'extrato' }"
                    :aria-selected="activeTab === 'extrato' ? 'true' : 'false'"
                    @click="setFinanceTab('extrato')"
                >
                    {{ t('finance.statement', 'Extrato') }}
                </button>
                <button
                    type="button"
                    role="tab"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': activeTab === 'seus-dados' }"
                    :aria-selected="activeTab === 'seus-dados' ? 'true' : 'false'"
                    @click="setFinanceTab('seus-dados')"
                >
                    Seus dados
                </button>
                <button
                    type="button"
                    role="tab"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': activeTab === 'dados' }"
                    :aria-selected="activeTab === 'dados' ? 'true' : 'false'"
                    @click="setFinanceTab('dados')"
                >
                    {{ t('finance.bank_details', 'Dados bancários') }}
                </button>
            </div>
        </div>

        <!-- Extrato -->
        <div v-show="activeTab === 'extrato'" class="andes-fin__panel">
            <div class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">{{ t('finance.withdrawals', 'Saques') }}</b>
            </div>

            <ul class="andes-ui-list andes-dash__list">
                <li
                    v-for="w in withdrawals"
                    :key="w.id"
                    class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                >
                    <div class="andes-ui-list__item-content">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon :name="bucketIcon(w.bucket)" />
                        </span>
                        <span class="andes-dash__list-main">
                            <span class="andes-ui-typography tp-body-medium w-emphasis">
                                {{ t('finance.withdrawal', 'Saque') }} · {{ bucketLabel(w.bucket) }}
                            </span>
                            <span class="andes-ui-typography tp-body-small c-secondary">
                                {{ withdrawDateLabel(w.created_at) }} · {{ t('finance.fee', 'Taxa') }} {{ formatBRL(w.fee_amount) }}
                            </span>
                        </span>
                    </div>
                    <span class="andes-dash__list-values">
                        <a
                            v-if="w.can_download_receipt"
                            :href="`/financeiro/saques/${w.id}/comprovante`"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="andes-ui-textlink andes-ui-textlink--small"
                        >
                            {{ t('finance.receipt', 'Comprovante') }}
                            <AndesIcon name="download" />
                        </a>
                        <span class="andes-ui-badge andes-ui-badge--medium" :class="statusBadgeClass(w.status)">
                            <span class="andes-ui-badge__content">{{ statusLabel(w.status) }}</span>
                        </span>
                        <AndesMoney :value="-(Number(w.net_amount) || 0)" :visible="valuesVisible" size="small" cents="comma" />
                    </span>
                </li>
                <li v-if="!hasExtratoContent" class="andes-ui-list__item andes-ui-list__item--size-large">
                    <span class="andes-dash__list-main">
                        <span class="andes-ui-typography tp-body-medium">{{ t('finance.no_withdrawals', 'Nenhum saque ainda') }}</span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ t('finance.no_withdrawals_hint', 'Seus saques solicitados aparecerão aqui.') }}
                        </span>
                    </span>
                </li>
            </ul>

            <!-- Análise: saldo por meio de pagamento e taxas do período -->
            <div v-if="wallet || settlementCards.length" class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">{{ t('finance.analysis', 'Análise da conta') }}</b>
            </div>
            <div class="andes-dash__grid andes-dash__grid--2">
                <div v-if="wallet" class="andes-ui-card andes-ui-card--padding-large">
                    <b class="andes-ui-typography tp-heading-medium" style="display: block; margin-bottom: 16px">
                        {{ t('finance.by_method', 'Disponível por meio de pagamento') }}
                    </b>
                    <div class="graph andes-fin__graph">
                        <div
                            v-for="bar in methodBars"
                            :key="bar.key"
                            class="graph-item"
                            :class="{ 'graph-item--active': bar.leading }"
                        >
                            <div class="graph-item__bar" :style="{ height: `${bar.height}px` }" />
                            <span class="graph-item__label">{{ bar.label }}</span>
                        </div>
                    </div>
                    <div class="andes-fin__stats">
                        <div v-for="bar in methodBars" :key="`v-${bar.key}`" class="andes-stat">
                            <span>{{ bar.label }}</span>
                            <AndesMoney :value="bar.value" :visible="valuesVisible" size="small" cents="comma" />
                        </div>
                    </div>
                </div>

                <div v-if="settlementCards.length" class="andes-ui-card andes-ui-card--padding-none">
                    <div class="andes-dash__sectionbar" style="padding: 16px 16px 0; margin-bottom: 0">
                        <b class="andes-ui-typography tp-heading-medium">
                            {{ t('finance.my_fees_and_payout', 'Minhas taxas e prazo') }}
                        </b>
                    </div>
                    <ul class="andes-ui-list" style="padding: 8px">
                        <li
                            v-for="card in settlementCards"
                            :key="card.label"
                            class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                        >
                            <div class="andes-ui-list__item-content">
                                <span class="andes-ui-thumbnail andes-ui-thumbnail--small andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                                    <AndesIcon :name="bucketIcon(card.label.toLowerCase().includes('pix') ? 'pix' : card.label.toLowerCase().includes('boleto') ? 'boleto' : 'card')" />
                                </span>
                                <span class="andes-dash__list-main">
                                    <span class="andes-ui-typography tp-body-small w-emphasis">{{ card.label }}</span>
                                    <span class="andes-ui-typography tp-body-small c-secondary">
                                        {{ t('finance.payout_deadline', 'Prazo de saque') }} {{ card.payoutText }} · + {{ formatBRL(card.fixed) }} fixo
                                    </span>
                                </span>
                            </div>
                            <span class="andes-ui-badge andes-ui-badge--large andes-ui-badge--neutral-quiet">
                                <span class="andes-ui-badge__content">{{ formatPercent(card.percent) }}</span>
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Seus dados (cadastro + KYC) -->
        <div v-show="activeTab === 'seus-dados'" class="andes-fin__panel">
            <div class="andes-ui-card andes-ui-card--padding-large andes-fin__block">
                <b class="andes-ui-typography tp-heading-medium" style="display: block">Dados do cadastro</b>
                <p class="andes-ui-typography tp-body-small c-secondary" style="margin: 4px 0 16px">
                    Informações preenchidas no cadastro. Para alterar, entre em contato com o suporte da plataforma.
                </p>
                <dl class="andes-fin__dl">
                    <div class="andes-fin__dl-full">
                        <dt>Tipo de conta</dt>
                        <dd>{{ snap(registration_snapshot.person_type_label) }}</dd>
                    </div>
                    <div>
                        <dt>Nome completo</dt>
                        <dd>{{ snap(registration_snapshot.name) }}</dd>
                    </div>
                    <div>
                        <dt>E-mail</dt>
                        <dd>{{ snap(registration_snapshot.email) }}</dd>
                    </div>
                    <div>
                        <dt>Data de nascimento</dt>
                        <dd>{{ snap(registration_snapshot.birth_date) }}</dd>
                    </div>
                    <div>
                        <dt>{{ registration_snapshot.person_type === 'pj' ? 'CNPJ' : 'CPF' }}</dt>
                        <dd>{{ snap(registration_snapshot.document) }}</dd>
                    </div>
                    <template v-if="registration_snapshot.person_type === 'pj'">
                        <div class="andes-fin__dl-full">
                            <dt>Razão social</dt>
                            <dd>{{ snap(registration_snapshot.company_name) }}</dd>
                        </div>
                        <div class="andes-fin__dl-full">
                            <dt>CPF do representante legal</dt>
                            <dd>{{ snap(registration_snapshot.legal_representative_cpf) }}</dd>
                        </div>
                    </template>
                    <div class="andes-fin__dl-sep">Endereço</div>
                    <div>
                        <dt>CEP</dt>
                        <dd>{{ snap(registration_snapshot.address_zip) }}</dd>
                    </div>
                    <div>
                        <dt>UF</dt>
                        <dd>{{ snap(registration_snapshot.address_state) }}</dd>
                    </div>
                    <div class="andes-fin__dl-full">
                        <dt>Logradouro</dt>
                        <dd>{{ snap(registration_snapshot.address_street) }}</dd>
                    </div>
                    <div>
                        <dt>Número</dt>
                        <dd>{{ snap(registration_snapshot.address_number) }}</dd>
                    </div>
                    <div>
                        <dt>Complemento</dt>
                        <dd>{{ snap(registration_snapshot.address_complement) }}</dd>
                    </div>
                    <div>
                        <dt>Bairro</dt>
                        <dd>{{ snap(registration_snapshot.address_neighborhood) }}</dd>
                    </div>
                    <div>
                        <dt>Cidade</dt>
                        <dd>{{ snap(registration_snapshot.address_city) }}</dd>
                    </div>
                    <div class="andes-fin__dl-sep">Faturamento mensal estimado (cadastro)</div>
                    <div class="andes-fin__dl-full">
                        <dd>{{ snap(registration_snapshot.monthly_revenue_label) }}</dd>
                    </div>
                </dl>
            </div>

            <div v-if="!showKycOnboardingModal" class="andes-fin__block">
                <KycDocumentsForm
                    embedded
                    :person_type="kyc_person_type"
                    :kyc_status="kyc_status || 'not_submitted'"
                    :rejection_reason="kyc_rejection_reason"
                />
            </div>
            <div v-else class="andes-ui-message andes-ui-message--caution andes-fin__block">
                <span class="andes-ui-message__text">Complete a verificação de identidade no modal para liberar o painel.</span>
            </div>
        </div>

        <!-- Dados bancários -->
        <div v-show="activeTab === 'dados'" class="andes-fin__panel">
            <div class="andes-ui-card andes-ui-card--padding-large andes-fin__block">
                <b class="andes-ui-typography tp-heading-medium" style="display: block; margin-bottom: 16px">Titular da conta</b>
                <dl class="andes-fin__dl">
                    <div>
                        <dt>Nome</dt>
                        <dd>{{ seller_profile.name || page.props.auth?.user?.name || '—' }}</dd>
                    </div>
                    <div>
                        <dt>E-mail</dt>
                        <dd>{{ seller_profile.email || page.props.auth?.user?.email || '—' }}</dd>
                    </div>
                    <div v-if="seller_profile.document" class="andes-fin__dl-full">
                        <dt>Documento</dt>
                        <dd>{{ seller_profile.document }}</dd>
                    </div>
                </dl>
            </div>

            <div v-if="canRequestWithdrawal && payout_pix_setup && !kycFinanceLocked" id="payout-pix-section">
                <div class="andes-dash__sectionbar">
                    <b class="andes-ui-typography tp-heading-large">Chave PIX e recebimento</b>
                    <button
                        v-if="hasPayoutPixRegistered && !editingPayoutPix"
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--quiet"
                        @click="startEditPayoutPix"
                    >
                        Editar
                    </button>
                    <button
                        v-if="hasPayoutPixRegistered && editingPayoutPix"
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute"
                        @click="cancelEditPayoutPix"
                    >
                        Cancelar
                    </button>
                </div>

                <!-- Somente leitura (já cadastrado) -->
                <div
                    v-if="hasPayoutPixRegistered && !editingPayoutPix"
                    class="andes-ui-card andes-ui-card--padding-large andes-fin__block"
                >
                    <dl class="andes-fin__dl">
                        <template v-if="payout_pix_setup === 'label_and_key'">
                            <div>
                                <dt>Identificação</dt>
                                <dd>{{ payoutPixLabelDisplay }}</dd>
                            </div>
                            <div v-if="(payout_settings.cajupay_pix_key_owner_document || '').replace(/\D/g, '').length >= 11">
                                <dt>CPF/CNPJ do titular</dt>
                                <dd>
                                    {{ maskCpfCnpjDigits(payout_settings.cajupay_pix_key_owner_document) }}
                                    <span class="andes-ui-typography tp-body-small c-secondary" style="display: block">
                                        Deve ser o mesmo CPF/CNPJ do titular da chave PIX cadastrada.
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt>Tipo da chave</dt>
                                <dd>{{ (payout_settings.cajupay_pix_key_type || payout_settings.payout_pix_key_type || '—').toUpperCase() }}</dd>
                            </div>
                            <div>
                                <dt>Chave PIX</dt>
                                <dd>{{ (payout_settings.cajupay_pix_key || '').trim() || '—' }}</dd>
                            </div>
                        </template>
                        <template v-else-if="payout_pix_setup === 'pix_key_only'">
                            <div>
                                <dt>Tipo da chave</dt>
                                <dd>{{ payoutPixTypeDisplay }}</dd>
                            </div>
                            <div>
                                <dt>Chave PIX</dt>
                                <dd>{{ payoutPixKeyDisplay || '—' }}</dd>
                            </div>
                        </template>
                        <template v-else-if="payout_pix_setup === 'key_and_receiver'">
                            <div>
                                <dt>Tipo da chave</dt>
                                <dd>{{ payoutPixTypeDisplay }}</dd>
                            </div>
                            <div>
                                <dt>Chave PIX</dt>
                                <dd>{{ payoutPixKeyDisplay || '—' }}</dd>
                            </div>
                            <div>
                                <dt>Nome do recebedor</dt>
                                <dd>{{ (payout_settings.receiver_name || '').trim() || '—' }}</dd>
                            </div>
                            <div>
                                <dt>CPF/CNPJ do recebedor</dt>
                                <dd>{{ (payout_settings.receiver_document || '').trim() || '—' }}</dd>
                            </div>
                            <div class="andes-fin__dl-full">
                                <dt>E-mail do recebedor</dt>
                                <dd>{{ (payout_settings.receiver_email || '').trim() || '—' }}</dd>
                            </div>
                        </template>
                    </dl>
                </div>

                <form v-if="!hasPayoutPixRegistered || editingPayoutPix" class="andes-fin__form" @submit.prevent="submitPayoutPix">
                    <template v-if="payout_pix_setup === 'label_and_key'">
                        <div class="andes-ui-message andes-ui-message--informative">
                            <span class="andes-ui-message__text">
                                A chave PIX e o documento informado em <b>CPF ou CNPJ do titular</b> devem estar corretos para aprovação do saque.
                                Para chave e-mail, telefone ou aleatória (EVP), informe também o documento do titular abaixo.
                            </span>
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="pix-label">Identificação</label>
                            <input
                                id="pix-label"
                                v-model="payoutPixForm.label"
                                type="text"
                                required
                                maxlength="120"
                                class="andes-ui-input"
                                placeholder="Ex.: conta principal"
                            />
                            <p v-if="payoutPixForm.errors.label" class="andes-fin__error">{{ payoutPixForm.errors.label }}</p>
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="pix-type">Tipo da chave</label>
                            <select id="pix-type" v-model="payoutPixForm.pix_key_type" class="andes-ui-input">
                                <option value="cpf">CPF</option>
                                <option value="cnpj">CNPJ</option>
                                <option value="email">E-mail</option>
                                <option value="phone">Telefone</option>
                                <option value="evp">Chave aleatória</option>
                            </select>
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="pix-key">Chave PIX</label>
                            <input id="pix-key" v-model="payoutPixForm.pix_key" type="text" required maxlength="120" class="andes-ui-input" autocomplete="off" />
                            <p v-if="payoutPixForm.errors.pix_key" class="andes-fin__error">{{ payoutPixForm.errors.pix_key }}</p>
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="pix-owner">CPF ou CNPJ do titular</label>
                            <input
                                id="pix-owner"
                                v-model="payoutPixForm.key_owner_document"
                                type="text"
                                required
                                maxlength="20"
                                inputmode="numeric"
                                class="andes-ui-input"
                                autocomplete="off"
                                placeholder="Mesmo CPF/CNPJ do titular da chave PIX"
                            />
                            <p class="andes-ui-form-control__help">
                                Obrigatório (11 ou 14 dígitos). Use o documento do titular da chave PIX cadastrada.
                            </p>
                            <p v-if="payoutPixForm.errors.key_owner_document" class="andes-fin__error">
                                {{ payoutPixForm.errors.key_owner_document }}
                            </p>
                        </div>
                    </template>
                    <template v-else-if="payout_pix_setup === 'pix_key_only'">
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="pix-type-only">Tipo da chave</label>
                            <select id="pix-type-only" v-model="payoutPixForm.pix_key_type" class="andes-ui-input">
                                <option value="cpf">CPF</option>
                                <option value="cnpj">CNPJ</option>
                                <option value="email">E-mail</option>
                                <option value="phone">Telefone</option>
                                <option value="evp">Chave aleatória</option>
                            </select>
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="pix-key-only">Chave PIX</label>
                            <input id="pix-key-only" v-model="payoutPixForm.pix_key" type="text" required maxlength="120" class="andes-ui-input" autocomplete="off" />
                            <p v-if="payoutPixForm.errors.pix_key" class="andes-fin__error">{{ payoutPixForm.errors.pix_key }}</p>
                        </div>
                    </template>
                    <template v-else-if="payout_pix_setup === 'key_and_receiver'">
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="pix-type-recv">Tipo da chave</label>
                            <select id="pix-type-recv" v-model="payoutPixForm.pix_key_type" class="andes-ui-input">
                                <option value="cpf">CPF</option>
                                <option value="cnpj">CNPJ</option>
                                <option value="email">E-mail</option>
                                <option value="phone">Telefone</option>
                                <option value="evp">Chave aleatória</option>
                            </select>
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="pix-key-recv">Chave PIX</label>
                            <input id="pix-key-recv" v-model="payoutPixForm.pix_key" type="text" required maxlength="120" class="andes-ui-input" autocomplete="off" />
                            <p v-if="payoutPixForm.errors.pix_key" class="andes-fin__error">{{ payoutPixForm.errors.pix_key }}</p>
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="recv-name">Nome do recebedor</label>
                            <input id="recv-name" v-model="payoutPixForm.receiver_name" type="text" required maxlength="120" class="andes-ui-input" />
                            <p v-if="payoutPixForm.errors.receiver_name" class="andes-fin__error">{{ payoutPixForm.errors.receiver_name }}</p>
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="recv-doc">CPF/CNPJ do recebedor</label>
                            <input id="recv-doc" v-model="payoutPixForm.receiver_document" type="text" required maxlength="20" class="andes-ui-input" />
                            <p v-if="payoutPixForm.errors.receiver_document" class="andes-fin__error">{{ payoutPixForm.errors.receiver_document }}</p>
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="recv-email">E-mail do recebedor</label>
                            <input id="recv-email" v-model="payoutPixForm.receiver_email" type="email" required maxlength="255" class="andes-ui-input" />
                            <p v-if="payoutPixForm.errors.receiver_email" class="andes-fin__error">{{ payoutPixForm.errors.receiver_email }}</p>
                        </div>
                    </template>
                    <div class="andes-fin__actions">
                        <button v-if="editingPayoutPix" type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="cancelEditPayoutPix">
                            Cancelar
                        </button>
                        <button type="submit" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" :disabled="payoutPixForm.processing">
                            {{
                                payout_pix_setup === 'label_and_key'
                                    ? payout_settings?.cajupay_pix_key_id
                                        ? 'Salvar alterações'
                                        : 'Cadastrar dados'
                                    : payout_pix_setup === 'pix_key_only'
                                      ? hasPayoutPixRegistered
                                          ? 'Salvar chave PIX'
                                          : 'Cadastrar chave PIX'
                                      : hasPayoutPixRegistered
                                        ? 'Salvar dados'
                                        : 'Cadastrar dados'
                            }}
                        </button>
                    </div>
                </form>
            </div>

            <div v-else-if="canRequestWithdrawal && !payout_pix_setup" class="andes-ui-message andes-ui-message--caution">
                <span class="andes-ui-message__text">
                    A plataforma ainda não configurou o recebimento automático de saques. Entre em contato com o suporte se precisar de ajuda.
                </span>
            </div>

            <p v-else class="andes-ui-typography tp-body-medium c-secondary">
                Apenas o titular (infoprodutor) pode alterar dados bancários e chave PIX.
            </p>
        </div>

        <div v-if="!canRequestWithdrawal" class="andes-ui-message andes-ui-message--informative andes-fin__block">
            <span class="andes-ui-message__text">
                Apenas o titular da conta (infoprodutor) pode solicitar saques e editar dados de recebimento. Você pode visualizar o extrato acima.
            </span>
        </div>

        <!-- Modal de saque -->
        <Teleport to="body">
            <Transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="showWithdrawModal"
                    class="andes-dash andes-fin andes-fin__modal"
                    style="padding: 16px"
                    aria-modal="true"
                    role="dialog"
                    aria-labelledby="withdraw-modal-title"
                    @keydown.escape="closeWithdrawModal"
                >
                    <div class="andes-fin__modal-veil" aria-hidden="true" @click="closeWithdrawModal" />
                    <div class="andes-ui-card andes-ui-card--padding-huge andes-fin__modal-card">
                        <div class="andes-fin__modal-head">
                            <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                                <AndesIcon name="export" />
                            </span>
                            <b id="withdraw-modal-title" class="andes-ui-typography tp-heading-large">Solicitar saque</b>
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                                aria-label="Fechar"
                                style="width: 32px; height: 32px; min-height: 32px"
                                @click="closeWithdrawModal"
                            >
                                <AndesIcon name="close" />
                            </button>
                        </div>

                        <p v-if="withdrawalFeeHint && hasPayoutPixRegistered" class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 16px">
                            {{ withdrawalFeeHint }}
                        </p>

                        <div v-if="!hasPayoutPixRegistered" class="andes-fin__form">
                            <div class="andes-ui-message andes-ui-message--caution">
                                <span class="andes-ui-message__text">
                                    <b class="andes-ui-message__title" style="display: block">Chave PIX não cadastrada</b>
                                    Cadastre sua chave PIX de recebimento antes de solicitar um saque.
                                </span>
                            </div>
                            <div class="andes-fin__actions">
                                <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="closeWithdrawModal">
                                    Cancelar
                                </button>
                                <button
                                    v-if="payout_pix_setup"
                                    type="button"
                                    class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                                    @click="goRegisterPayoutPix"
                                >
                                    Cadastrar chave PIX
                                </button>
                            </div>
                            <p v-if="!payout_pix_setup" class="andes-ui-typography tp-body-small c-secondary">
                                A plataforma ainda não habilitou o cadastro de chave PIX. Fale com o suporte.
                            </p>
                        </div>

                        <form v-else class="andes-fin__form" @submit.prevent="submitWithdraw">
                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="withdraw-amount">Valor (R$)</label>
                                <input
                                    id="withdraw-amount"
                                    v-model="withdrawForm.amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                    class="andes-ui-input"
                                />
                                <p v-if="withdrawForm.errors.amount" class="andes-fin__error">{{ withdrawForm.errors.amount }}</p>
                            </div>
                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="withdraw-bucket">Carteira</label>
                                <select id="withdraw-bucket" v-model="withdrawForm.bucket" class="andes-ui-input">
                                    <option value="pix">PIX</option>
                                    <option value="card">Cartão</option>
                                    <option value="boleto">Boleto</option>
                                </select>
                            </div>
                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="withdraw-notes">Observações (opcional)</label>
                                <textarea
                                    id="withdraw-notes"
                                    v-model="withdrawForm.notes"
                                    rows="2"
                                    class="andes-ui-input"
                                    placeholder="Referência ou observação"
                                />
                            </div>
                            <div class="andes-fin__actions">
                                <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="closeWithdrawModal">
                                    Cancelar
                                </button>
                                <button type="submit" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" :disabled="withdrawForm.processing">
                                    Enviar solicitação
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <KycOnboardingModal
            :open="showKycOnboardingModal"
            :person_type="kyc_person_type"
            :kyc_status="kyc_status || 'not_submitted'"
            :rejection_reason="kyc_rejection_reason"
        />
    </div>
</template>
