<script setup>
/**
 * Detalhe da assinatura no design system Andes: cabeçalho com o assinante,
 * o valor do plano em destaque, indicadores do ciclo e os pedidos como lista.
 */
import { computed } from 'vue';
import { Link, router, useForm, usePage } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import VendasTabs from '@/components/vendas/VendasTabs.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { useI18n } from '@/composables/useI18n';

defineOptions({ layout: LayoutInfoprodutor });
const { t } = useI18n();
const page = usePage();

const props = defineProps({
    subscription: { type: Object, required: true },
    recent_orders: { type: Array, default: () => [] },
    cancel_grace_days: { type: Number, default: 14 },
});

const flashSuccess = computed(() => page.props.flash?.success ?? null);
const flashError = computed(() => page.props.flash?.error ?? null);

const cancelForm = useForm({});

const STATUS_BADGE = {
    active: 'andes-ui-badge--positive-quiet',
    past_due: 'andes-ui-badge--caution-quiet',
    cancelled: 'andes-ui-badge--neutral-quiet',
};

function statusBadgeClass(status) {
    return STATUS_BADGE[status] ?? 'andes-ui-badge--neutral-quiet';
}

function statusBadgeLabel(status) {
    const map = {
        active: t('subscriptions.status.active', 'Ativa'),
        past_due: t('subscriptions.status.past_due', 'Em atraso'),
        cancelled: t('subscriptions.status.cancelled', 'Cancelada'),
    };
    return map[status] ?? status ?? '–';
}

const ORDER_STATUS_BADGE = {
    completed: 'andes-ui-badge--positive-quiet',
    pending: 'andes-ui-badge--caution-quiet',
    refunded: 'andes-ui-badge--negative-quiet',
    cancelled: 'andes-ui-badge--neutral-quiet',
};

function orderBadgeClass(status) {
    return ORDER_STATUS_BADGE[status] ?? 'andes-ui-badge--neutral-quiet';
}

function shortDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    const dia = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    return `${dia} · ${hora}`;
}

const canCancel = computed(() => ['active', 'past_due'].includes(props.subscription.status));

function cancelSubscription() {
    if (!confirm(t('subscriptions.confirm_cancel', 'Cancelar esta assinatura? O cliente perderá o acesso após o período vigente.'))) {
        return;
    }
    cancelForm.post(`/vendas/assinaturas/${props.subscription.id}/cancel`, { preserveScroll: true });
}

function openOrder(o) {
    router.visit(`/vendas?q=${encodeURIComponent(o.public_reference || '')}`);
}
</script>

<template>
    <div class="andes-dash andes-sub">
        <VendasTabs />

        <Link href="/vendas/assinaturas" class="andes-ui-textlink andes-block--tight" style="display: inline-flex">
            <AndesIcon name="forward" style="transform: rotate(180deg)" />
            {{ t('subscriptions.back_to_list', 'Voltar às assinaturas') }}
        </Link>

        <div v-if="flashSuccess" class="andes-ui-message andes-ui-message--positive andes-block--tight">
            <span class="andes-ui-message__text">{{ flashSuccess }}</span>
        </div>
        <div v-if="flashError" class="andes-ui-message andes-ui-message--negative andes-block--tight">
            <span class="andes-ui-message__text">{{ flashError }}</span>
        </div>

        <div class="andes-ui-card andes-ui-card--padding-huge andes-block--tight">
            <div class="andes-toolbar" style="margin-bottom: 20px">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="refresh" />
                </span>
                <span class="andes-dash__list-main">
                    <b class="andes-ui-typography tp-heading-large">{{ subscription.user?.name || '—' }}</b>
                    <span class="andes-ui-typography tp-body-small c-secondary">{{ subscription.user?.email }}</span>
                    <span class="andes-ui-typography tp-body-small c-secondary">
                        {{ subscription.product?.name }} · {{ subscription.plan?.name }}
                        ({{ subscription.plan?.interval_label || subscription.plan?.interval }})
                    </span>
                </span>
                <div class="andes-toolbar__end">
                    <span class="andes-ui-badge andes-ui-badge--large" :class="statusBadgeClass(subscription.status)">
                        <span class="andes-ui-badge__content">{{ statusBadgeLabel(subscription.status) }}</span>
                    </span>
                </div>
            </div>

            <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 4px">
                {{ t('subscriptions.plan_price', 'Valor do plano') }}
            </div>
            <div class="andes-dash__hero-value">
                <AndesMoney :value="Number(subscription.plan?.price) || 0" size="xhuge" cents="sups" />
            </div>

            <div class="andes-dash__hero-stats">
                <div class="andes-stat">
                    <span>{{ t('subscriptions.paid_periods', 'Períodos pagos') }}</span>
                    <b class="andes-ui-typography tp-heading-medium">{{ subscription.paid_periods_count }}</b>
                </div>
                <div class="andes-stat">
                    <span>{{ t('subscriptions.period_start', 'Início do período') }}</span>
                    <b class="andes-ui-typography tp-heading-medium">{{ subscription.current_period_start || '—' }}</b>
                </div>
                <div class="andes-stat">
                    <span>{{ t('subscriptions.renews_on', 'Renova em') }}</span>
                    <b class="andes-ui-typography tp-heading-medium">{{ subscription.current_period_end || '—' }}</b>
                </div>
            </div>

            <p v-if="subscription.status !== 'cancelled'" class="andes-ui-typography tp-body-small c-secondary" style="margin-top: 16px">
                Assinaturas em atraso podem ser canceladas automaticamente {{ cancel_grace_days }} dias após o fim do período.
            </p>

            <div v-if="canCancel" class="andes-actions" style="justify-content: flex-start; margin-top: 16px">
                <button
                    type="button"
                    class="andes-ui-button andes-ui-button--medium andes-ui-button--quiet"
                    :disabled="cancelForm.processing"
                    @click="cancelSubscription"
                >
                    <AndesIcon name="close" />
                    {{ t('subscriptions.cancel', 'Cancelar assinatura') }}
                </button>
            </div>
        </div>

        <div class="andes-dash__sectionbar">
            <b class="andes-ui-typography tp-heading-large">{{ t('subscriptions.recent_orders', 'Pedidos recentes') }}</b>
        </div>

        <ul v-if="recent_orders.length" class="andes-ui-list andes-dash__list">
            <li
                v-for="o in recent_orders"
                :key="o.id"
                class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                role="button"
                tabindex="0"
                @click="openOrder(o)"
                @keydown.enter.prevent="openOrder(o)"
            >
                <div class="andes-ui-list__item-content">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                        <AndesIcon name="hand-money" />
                    </span>
                    <span class="andes-dash__list-main">
                        <span class="andes-ui-typography tp-body-medium w-emphasis">
                            {{ o.public_reference || `#${o.id}` }}
                        </span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ o.is_renewal ? t('subscriptions.renewal', 'Renovação') : t('subscriptions.first_charge', 'Primeira cobrança') }}
                            · {{ shortDate(o.created_at) }}
                        </span>
                    </span>
                </div>
                <span class="andes-dash__list-values">
                    <span class="andes-ui-badge andes-ui-badge--medium" :class="orderBadgeClass(o.status)">
                        <span class="andes-ui-badge__content">{{ o.status }}</span>
                    </span>
                    <AndesMoney :value="Number(o.amount) || 0" size="medium" cents="comma" />
                    <span class="andes-ui-list__item-chevron"><AndesIcon name="chevron-right" /></span>
                </span>
            </li>
        </ul>

        <div v-else class="andes-ui-card andes-ui-card--padding-large">
            <div class="andes-empty">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="hand-money" />
                </span>
                <b class="andes-ui-typography tp-heading-medium">{{ t('subscriptions.no_orders', 'Nenhum pedido encontrado para este plano.') }}</b>
            </div>
        </div>
    </div>
</template>
