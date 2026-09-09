<script setup>
/**
 * Assinaturas no design system Andes.
 * Uma lista só (o cartão do mobile e a tabela do desktop viraram a mesma
 * linha do guia), MRR em destaque e o status como filtro em menu.
 */
import { computed } from 'vue';
import { router } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import VendasTabs from '@/components/vendas/VendasTabs.vue';
import AndesFilterMenu from '@/components/andes/AndesFilterMenu.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { useI18n } from '@/composables/useI18n';
import { htmlToText } from '@/lib/sanitizeHtml';

defineOptions({ layout: LayoutInfoprodutor });
const { t } = useI18n();

const props = defineProps({
    stats: { type: Object, default: () => ({ ativas: 0, clientes: 0, mrr: 0 }) },
    assinaturas: { type: [Array, Object], default: () => [] },
    status_filter: { type: String, default: 'active' },
});

const assinaturasList = computed(() => props.assinaturas?.data ?? (Array.isArray(props.assinaturas) ? props.assinaturas : []));

const statusTabs = computed(() => [
    { value: 'active', label: t('subscriptions.status.active', 'Ativas') },
    { value: 'past_due', label: t('subscriptions.status.past_due', 'Em atraso') },
    { value: 'cancelled', label: t('subscriptions.status.cancelled', 'Canceladas') },
    { value: 'all', label: t('subscriptions.filter_all', 'Todas') },
]);

function filterStatus(status) {
    router.get('/vendas/assinaturas', { status }, { preserveState: true, replace: true });
}

function openSubscription(id) {
    router.visit(`/vendas/assinaturas/${id}`);
}

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

/* Linha de apoio: produto, plano, intervalo e quando renova, num fôlego só. */
function planLine(s) {
    const partes = [s.product?.name, s.plan?.name, s.plan?.interval_label || s.plan?.interval].filter(Boolean);
    return partes.join(' · ') || '—';
}
</script>

<template>
    <div class="andes-dash andes-sub">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">{{ t('sales.tab_subscriptions', 'Assinaturas') }}</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                {{ t('subscriptions.subtitle', 'Acompanhe a receita recorrente, quem renova e quem está em atraso.') }}
            </p>
        </header>

        <VendasTabs />

        <div class="andes-ui-card andes-ui-card--padding-huge andes-block--tight">
            <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 4px">
                {{ t('subscriptions.mrr', 'Receita recorrente mensal') }}
            </div>
            <div class="andes-dash__hero-value">
                <AndesMoney :value="Number(stats.mrr) || 0" size="xhuge" cents="sups" />
            </div>
            <div class="andes-dash__hero-stats">
                <div class="andes-stat">
                    <span>{{ t('subscriptions.active', 'Assinaturas ativas') }}</span>
                    <b class="andes-ui-typography tp-heading-medium">{{ stats.ativas }}</b>
                </div>
                <div class="andes-stat">
                    <span>{{ t('sales.customer', 'Clientes') }}</span>
                    <b class="andes-ui-typography tp-heading-medium">{{ stats.clientes }}</b>
                </div>
            </div>
        </div>

        <div class="andes-filterbar">
            <AndesFilterMenu
                :label="t('sales.status', 'Status')"
                icon="filters"
                :options="statusTabs"
                :model-value="status_filter"
                neutral-value="all"
                @change="filterStatus"
            />
        </div>

        <ul v-if="assinaturasList.length" class="andes-ui-list andes-dash__list">
            <li
                v-for="s in assinaturasList"
                :key="s.id"
                class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                role="button"
                tabindex="0"
                @click="openSubscription(s.id)"
                @keydown.enter.prevent="openSubscription(s.id)"
            >
                <div class="andes-ui-list__item-content">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                        <AndesIcon name="refresh" />
                    </span>
                    <span class="andes-dash__list-main">
                        <span class="andes-ui-typography tp-body-medium w-emphasis">{{ s.user?.name || '—' }}</span>
                        <span class="andes-ui-typography tp-body-small c-secondary">{{ s.user?.email || '—' }}</span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ planLine(s) }}
                            <template v-if="s.current_period_end">
                                · {{ t('subscriptions.renews_on', 'Renova em') }} {{ s.current_period_end }}
                            </template>
                        </span>
                    </span>
                </div>
                <span class="andes-dash__list-values">
                    <span class="andes-ui-badge andes-ui-badge--medium" :class="statusBadgeClass(s.status)">
                        <span class="andes-ui-badge__content">{{ statusBadgeLabel(s.status) }}</span>
                    </span>
                    <span class="andes-ui-list__item-chevron"><AndesIcon name="chevron-right" /></span>
                </span>
            </li>
        </ul>

        <div v-else class="andes-ui-card andes-ui-card--padding-large">
            <div class="andes-empty">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="refresh" />
                </span>
                <b class="andes-ui-typography tp-heading-medium">{{ t('subscriptions.empty', 'Nenhuma assinatura ainda') }}</b>
                <span class="andes-ui-typography tp-body-small c-secondary">
                    {{ t('subscriptions.empty_hint', 'Os produtos configurados como "Assinatura" com planos aparecerão aqui quando houver assinantes ativos.') }}
                </span>
            </div>
        </div>

        <nav v-if="assinaturas?.links?.length > 3" class="andes-pagination" :aria-label="t('common.pagination', 'Paginação')">
            <a
                v-for="link in assinaturas.links"
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
    </div>
</template>
