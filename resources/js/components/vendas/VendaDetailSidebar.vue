<script setup>
/**
 * Detalhe da venda como gaveta do design system Andes.
 *
 * Composição: resumo (valor, estado, data) → ações rápidas → abas com o resto.
 * As ações da venda moram aqui, junto do contexto, e não mais num menu
 * flutuante na linha da lista.
 */
import { ref, computed } from 'vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

const props = defineProps({
    open: { type: Boolean, default: false },
    venda: { type: Object, default: null },
    resending: { type: Boolean, default: false },
    whatsappUrl: { type: String, default: '' },
    canRefund: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'resend', 'refund']);

useBodyScrollLock(() => props.open);

const activeTab = ref('venda');

const TABS = [
    { id: 'venda', label: 'Venda', icon: 'hand-money' },
    { id: 'cliente', label: 'Cliente', icon: 'user' },
    { id: 'rastreio', label: 'Rastreio', icon: 'chart-line' },
];

function trackingValue(key) {
    const v = props.venda;
    if (!v) return '';
    const fromSession = v.checkout_session?.[key];
    const fromMeta = v.metadata?.[key];
    return String(fromSession ?? fromMeta ?? '').trim();
}

const utmRows = computed(() => {
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'sck', 'src'];
    return keys.map((key) => ({ key, label: key, value: trackingValue(key) }));
});

const hasTracking = computed(() => utmRows.value.some((r) => r.value !== ''));

function close() {
    emit('close');
}

function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

function formatDate(value) {
    if (!value) return '–';
    const d = new Date(value);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/* Data curta do guia: "3/set · 12h47". */
function shortDate(value) {
    if (!value) return '–';
    const d = new Date(value);
    const dia = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    return `${dia} · ${hora}`;
}

const STATUS_LABEL = {
    completed: 'Pago',
    pending: 'Pendente',
    disputed: 'MED',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
};

const STATUS_BADGE = {
    completed: 'andes-ui-badge--positive-quiet',
    pending: 'andes-ui-badge--caution-quiet',
    disputed: 'andes-ui-badge--caution-quiet',
    cancelled: 'andes-ui-badge--neutral-quiet',
    refunded: 'andes-ui-badge--negative-quiet',
};

function statusLabel(status) {
    return STATUS_LABEL[status] ?? status ?? '–';
}

const statusBadgeClass = computed(() => STATUS_BADGE[props.venda?.status] ?? 'andes-ui-badge--neutral-quiet');

const amountTone = computed(() =>
    ['refunded', 'cancelled'].includes(props.venda?.status) ? 'strikethrough' : '',
);

/* Círculo do cabeçalho: o meio de pagamento da venda. */
const headerIcon = computed(() => {
    const v = props.venda;
    if (v?.is_pixgo || v?.is_api_pix) return 'pix';
    const method = String(v?.payment_method ?? v?.gateway_label ?? '').toLowerCase();
    if (method.includes('pix')) return 'pix';
    if (method.includes('card') || method.includes('cart')) return 'card';
    if (method.includes('boleto')) return 'document-text';
    return 'hand-money';
});

function refundAuthorLabel(manualRefund) {
    if (!manualRefund) return '—';
    if (manualRefund.initiated_by === 'platform') return 'Plataforma';
    if (manualRefund.initiated_by === 'seller') return 'Você';
    return manualRefund.initiated_by_label ?? manualRefund.initiated_by_name ?? '—';
}

function itemLabel(item) {
    const isBump = Number(item?.position ?? 0) > 0;
    const baseName =
        item?.product?.name ??
        item?.product_offer?.name ??
        item?.subscription_plan?.name ??
        'Item';
    return isBump ? `${baseName} (Bump)` : baseName;
}

const hasShipping = computed(() => {
    const v = props.venda;
    if (!v) return false;
    return Number(v.shipping_amount ?? 0) > 0 || (v.shipping_address && Object.keys(v.shipping_address).length > 0);
});

const shippingAddressLines = computed(() => {
    const addr = props.venda?.shipping_address;
    if (!addr || typeof addr !== 'object') return [];
    const lines = [];
    if (addr.street) {
        let line = addr.street;
        if (addr.number) line += `, ${addr.number}`;
        lines.push(line);
    }
    if (addr.complement) lines.push(addr.complement);
    if (addr.neighborhood) lines.push(addr.neighborhood);
    if (addr.city || addr.state) {
        lines.push([addr.city, addr.state].filter(Boolean).join(' — '));
    }
    if (addr.zip) lines.push(`CEP ${addr.zip}`);
    return lines;
});

const shippingDeliveryLabel = computed(() => {
    const meta = props.venda?.metadata ?? {};
    const min = meta.delivery_days_min;
    const max = meta.delivery_days_max;
    if (min == null) return '';
    if (max != null && max !== min) return `${min}–${max} dias úteis`;
    return `${min} dias úteis`;
});

const partnerCheckoutUrl = computed(
    () => props.venda?.partner_checkout_url || props.venda?.metadata?.partner_checkout_url || '',
);

/* Reenviar e-mail não vale para pagamento que ainda não entrou. */
const canResend = computed(() => props.venda && props.venda.status !== 'pending');
</script>

<template>
    <Teleport to="body">
        <div v-show="open" class="andes-dash andes-drawer" style="z-index: 100000" aria-modal="true" role="dialog">
            <div class="andes-modal__veil" aria-hidden="true" @click="close" />

            <aside class="andes-ui-card andes-ui-card--padding-none andes-drawer__card">
                <header class="andes-drawer__head">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                        <AndesIcon :name="headerIcon" />
                    </span>
                    <b class="andes-ui-typography tp-heading-large">Detalhes da venda</b>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                        style="width: 32px; height: 32px; min-height: 32px; margin-left: auto"
                        aria-label="Fechar"
                        @click="close"
                    >
                        <AndesIcon name="close" />
                    </button>
                </header>

                <div v-if="!venda" class="andes-empty">
                    <span class="andes-ui-typography tp-body-medium c-secondary">Nenhuma venda selecionada.</span>
                </div>

                <template v-else>
                    <!-- Resumo: o que a pessoa abriu a gaveta para ver -->
                    <div class="andes-drawer__summary">
                        <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 4px">Valor líquido</div>
                        <AndesMoney
                            :value="Number(venda.amount_net ?? venda.amount_total ?? venda.amount) || 0"
                            :tone="amountTone"
                            size="xhuge"
                            cents="sups"
                        />
                        <div class="andes-drawer__summary-meta">
                            <span class="andes-ui-badge andes-ui-badge--large" :class="statusBadgeClass">
                                <span class="andes-ui-badge__content">{{ statusLabel(venda.status) }}</span>
                            </span>
                            <span class="andes-ui-typography tp-body-small c-secondary">{{ shortDate(venda.created_at) }}</span>
                        </div>

                        <!-- Ações rápidas do guia: ícone circular + rótulo curto -->
                        <div class="andes-ui-shortcuts andes-drawer__actions">
                            <a
                                v-if="whatsappUrl"
                                :href="whatsappUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="andes-ui-shortcut"
                            >
                                <span class="andes-ui-shortcut__icon"><AndesIcon name="forward" /></span>
                                <span class="andes-ui-shortcut__label">WhatsApp</span>
                            </a>
                            <button
                                v-if="canResend"
                                type="button"
                                class="andes-ui-shortcut"
                                :disabled="resending"
                                @click="emit('resend')"
                            >
                                <span class="andes-ui-shortcut__icon"><AndesIcon name="export" /></span>
                                <span class="andes-ui-shortcut__label">{{ resending ? 'Enviando' : 'Reenviar e-mail' }}</span>
                            </button>
                            <a
                                v-if="venda.checkout_url"
                                :href="venda.checkout_url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="andes-ui-shortcut"
                            >
                                <span class="andes-ui-shortcut__icon"><AndesIcon name="link" /></span>
                                <span class="andes-ui-shortcut__label">Checkout</span>
                            </a>
                            <button v-if="canRefund" type="button" class="andes-ui-shortcut" @click="emit('refund')">
                                <span class="andes-ui-shortcut__icon"><AndesIcon name="import" /></span>
                                <span class="andes-ui-shortcut__label">Reembolsar</span>
                            </button>
                        </div>
                    </div>

                    <div class="andes-ui-tabs">
                        <div class="andes-ui-tabs__tablist" role="tablist" aria-label="Detalhes da venda">
                            <button
                                v-for="tab in TABS"
                                :key="tab.id"
                                type="button"
                                role="tab"
                                class="andes-ui-tab"
                                :class="{ 'andes-ui-tab--selected': activeTab === tab.id }"
                                :aria-selected="activeTab === tab.id ? 'true' : 'false'"
                                @click="activeTab = tab.id"
                            >
                                <AndesIcon :name="tab.icon" />
                                {{ tab.label }}
                            </button>
                        </div>
                    </div>

                    <div class="andes-drawer__body">
                        <!-- Venda -->
                        <div v-show="activeTab === 'venda'">
                            <div v-if="venda.status === 'refunded' && venda.manual_refund" class="andes-ui-message andes-ui-message--negative andes-block--tight">
                                <span class="andes-ui-message__text">
                                    <b class="andes-ui-message__title" style="display: block">Reembolso por {{ refundAuthorLabel(venda.manual_refund) }}</b>
                                    <template v-if="venda.manual_refund.refunded_at">{{ formatDate(venda.manual_refund.refunded_at) }}<br /></template>
                                    <template v-if="venda.manual_refund.reason">Motivo: {{ venda.manual_refund.reason }}</template>
                                </span>
                            </div>

                            <div v-if="venda.is_affiliate_sale" class="andes-ui-message andes-ui-message--informative andes-block--tight">
                                <span class="andes-ui-message__text">
                                    <b class="andes-ui-message__title" style="display: block">Venda de afiliado</b>
                                    {{ venda.affiliate_name ?? '—' }}
                                    <template v-if="venda.affiliate_commission_percent != null">
                                        · {{ venda.affiliate_commission_percent }}% de comissão
                                    </template>
                                </span>
                            </div>

                            <div v-if="hasShipping" class="andes-ui-message andes-ui-message--positive andes-block--tight">
                                <span class="andes-ui-message__text">
                                    <b class="andes-ui-message__title" style="display: block">Entrega</b>
                                    <template v-if="Number(venda.shipping_amount) > 0">Frete {{ formatBRL(venda.shipping_amount) }}</template>
                                    <template v-else>Frete grátis</template>
                                    <template v-if="shippingDeliveryLabel"> · {{ shippingDeliveryLabel }}</template>
                                    <template v-if="shippingAddressLines.length">
                                        <br /><template v-for="(line, i) in shippingAddressLines" :key="i">{{ line }}<br /></template>
                                    </template>
                                </span>
                            </div>

                            <dl class="andes-dl andes-block--tight">
                                <div class="andes-dl__full">
                                    <dt>Produto</dt>
                                    <dd>{{ venda.product_display_name ?? venda.product?.name ?? '–' }}</dd>
                                </div>
                                <div>
                                    <dt>Valor bruto</dt>
                                    <dd>{{ formatBRL(venda.amount_total ?? venda.amount) }}</dd>
                                </div>
                                <div>
                                    <dt>Taxas</dt>
                                    <dd>{{ formatBRL(venda.fee_total ?? 0) }}</dd>
                                </div>
                                <div>
                                    <dt>Método de pagamento</dt>
                                    <dd>
                                        {{ venda.gateway_label ?? '–' }}
                                        <span v-if="venda.cajupay_account_badge" class="andes-ui-typography tp-body-small c-secondary" style="display: block">
                                            CajuPay: {{ venda.cajupay_account_badge }}
                                        </span>
                                    </dd>
                                </div>
                                <div>
                                    <dt>Tipo</dt>
                                    <dd>{{ venda.payment_type_label ?? 'Pagamento único' }}</dd>
                                </div>
                                <div v-if="venda.sale_origin_label">
                                    <dt>Origem da venda</dt>
                                    <dd>{{ venda.sale_origin_label }}</dd>
                                </div>
                                <div>
                                    <dt>Recorrência</dt>
                                    <dd>{{ venda.subscription_plan_id ? 'Assinatura' : '–' }}</dd>
                                </div>
                                <div v-if="venda.tenant_owner && (venda.tenant_owner.name || venda.tenant_owner.email)" class="andes-dl__full">
                                    <dt>Infoprodutor</dt>
                                    <dd>
                                        {{ venda.tenant_owner.name ?? '—' }}
                                        <span class="andes-ui-typography tp-body-small c-secondary" style="display: block">
                                            {{ venda.tenant_owner.email ?? '—' }}
                                        </span>
                                    </dd>
                                </div>
                                <div class="andes-dl__full">
                                    <dt>Criada em</dt>
                                    <dd>{{ formatDate(venda.created_at) }}</dd>
                                </div>
                                <div class="andes-dl__full">
                                    <dt>ID da venda</dt>
                                    <dd><code class="andes-code">{{ String(venda.id) }}</code></dd>
                                </div>
                            </dl>

                            <template v-if="(venda.order_items ?? []).length">
                                <div class="andes-dash__sectionbar">
                                    <b class="andes-ui-typography tp-heading-medium">Itens da compra</b>
                                </div>
                                <ul class="andes-ui-list andes-block--tight">
                                    <li
                                        v-for="(item, idx) in (venda.order_items ?? [])"
                                        :key="idx"
                                        class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                                    >
                                        <span class="andes-ui-typography tp-body-small">{{ itemLabel(item) }}</span>
                                        <AndesMoney :value="Number(item.amount) || 0" size="small" cents="comma" />
                                    </li>
                                </ul>
                            </template>

                            <div v-if="partnerCheckoutUrl" class="andes-block--tight">
                                <div class="andes-ui-typography tp-body-small c-secondary">Link checkout parceiro (API)</div>
                                <a :href="partnerCheckoutUrl" target="_blank" rel="noopener noreferrer" class="andes-ui-textlink andes-ui-textlink--small">
                                    {{ partnerCheckoutUrl }}
                                    <AndesIcon name="link" />
                                </a>
                            </div>
                        </div>

                        <!-- Cliente -->
                        <div v-show="activeTab === 'cliente'">
                            <dl class="andes-dl">
                                <div class="andes-dl__full">
                                    <dt>Nome</dt>
                                    <dd>{{ venda.user?.name ?? venda.email ?? '–' }}</dd>
                                </div>
                                <div class="andes-dl__full">
                                    <dt>E-mail</dt>
                                    <dd>{{ venda.email ?? venda.user?.email ?? '–' }}</dd>
                                </div>
                                <div>
                                    <dt>Celular</dt>
                                    <dd>{{ venda.phone ?? '–' }}</dd>
                                </div>
                                <div>
                                    <dt>CPF</dt>
                                    <dd>{{ venda.cpf ?? '–' }}</dd>
                                </div>
                                <div>
                                    <dt>IP</dt>
                                    <dd>{{ venda.customer_ip ?? '–' }}</dd>
                                </div>
                            </dl>
                        </div>

                        <!-- Rastreio -->
                        <div v-show="activeTab === 'rastreio'">
                            <p v-if="!hasTracking" class="andes-ui-typography tp-body-medium c-secondary">
                                Esta venda entrou sem parâmetros de rastreio.
                            </p>
                            <dl v-else class="andes-dl">
                                <div v-for="row in utmRows" :key="row.key" class="andes-dl__full">
                                    <dt>{{ row.label }}</dt>
                                    <dd :class="{ 'c-secondary': !row.value }">{{ row.value || 'Não informado' }}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </template>
            </aside>
        </div>
    </Teleport>
</template>
