<script setup>
/**
 * Disputas MED no design system Andes. A urgência vem no topo (quantas estão
 * abertas e o que fazer), a tabela virou lista com valor à direita.
 */
import { computed } from 'vue';
import { router } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import VendasTabs from '@/components/vendas/VendasTabs.vue';
import AndesFilterMenu from '@/components/andes/AndesFilterMenu.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';

defineOptions({ layout: LayoutInfoprodutor });

const props = defineProps({
    disputes: { type: Array, default: () => [] },
    filter_status: { type: String, default: 'open' },
    open_count: { type: Number, default: 0 },
});

const statusTabs = [
    { value: 'open', label: 'Abertas' },
    { value: 'resolved', label: 'Resolvidas' },
    { value: 'all', label: 'Todas' },
];

const STATUS_LABEL = {
    open: 'Aberta',
    defense_submitted: 'Defesa enviada',
    resolved_won: 'Ganha',
    resolved_lost: 'Perdida',
    cancelled: 'Cancelada',
};

const STATUS_BADGE = {
    open: 'andes-ui-badge--caution-quiet',
    defense_submitted: 'andes-ui-badge--informative-quiet',
    resolved_won: 'andes-ui-badge--positive-quiet',
    resolved_lost: 'andes-ui-badge--negative-quiet',
    cancelled: 'andes-ui-badge--neutral-quiet',
};

function statusLabel(s) {
    return STATUS_LABEL[s] ?? s;
}

function statusBadgeClass(s) {
    return STATUS_BADGE[s] ?? 'andes-ui-badge--neutral-quiet';
}

function setFilter(status) {
    router.get('/vendas/disputas', { status }, { preserveState: true, preserveScroll: true, replace: true });
}

function openDispute(d) {
    router.visit(`/vendas/disputas/${d.id}`);
}

const totalContestado = computed(() =>
    props.disputes.reduce((sum, d) => sum + (Number(d.amount_cents) || 0), 0) / 100,
);
</script>

<template>
    <div class="andes-dash andes-med">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">Disputas MED</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                Contestações PIX abertas pelo banco. Envie sua defesa antes do prazo.
            </p>
        </header>

        <VendasTabs />

        <div v-if="open_count > 0" class="andes-ui-message andes-ui-message--caution andes-block--tight">
            <span class="andes-ui-message__text">
                <b class="andes-ui-message__title" style="display: block">
                    {{ open_count }} {{ open_count === 1 ? 'disputa aberta' : 'disputas abertas' }}
                </b>
                Cada uma tem prazo de defesa. Abra a disputa, gere a prova de entrega e envie o texto ao banco.
            </span>
        </div>

        <div class="andes-ui-card andes-ui-card--padding-huge andes-block--tight">
            <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 4px">Valor contestado neste recorte</div>
            <div class="andes-dash__hero-value">
                <AndesMoney :value="totalContestado" size="xhuge" cents="sups" />
            </div>
            <div class="andes-ui-typography tp-body-small c-secondary" style="margin-top: 6px">
                {{ disputes.length }} {{ disputes.length === 1 ? 'disputa' : 'disputas' }}
            </div>
        </div>

        <div class="andes-filterbar">
            <AndesFilterMenu
                label="Status"
                icon="filters"
                :options="statusTabs"
                :model-value="filter_status"
                neutral-value="all"
                @change="setFilter"
            />
        </div>

        <ul v-if="disputes.length" class="andes-ui-list andes-dash__list">
            <li
                v-for="d in disputes"
                :key="d.id"
                class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                role="button"
                tabindex="0"
                @click="openDispute(d)"
                @keydown.enter.prevent="openDispute(d)"
            >
                <div class="andes-ui-list__item-content">
                    <span class="andes-thumb">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="shield" />
                        </span>
                        <span
                            v-if="d.status === 'open'"
                            class="andes-ui-badge andes-ui-badge--small andes-ui-badge--caution andes-thumb__mark"
                            aria-hidden="true"
                        />
                    </span>
                    <span class="andes-dash__list-main">
                        <span class="andes-ui-typography tp-body-medium w-emphasis">
                            #{{ d.order?.public_reference ?? d.order?.id }}
                        </span>
                        <span class="andes-ui-typography tp-body-small c-secondary">{{ d.order?.product_name ?? '—' }}</span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ statusLabel(d.status) }}<template v-if="d.reason"> · {{ d.reason }}</template>
                        </span>
                    </span>
                </div>
                <span class="andes-dash__list-values">
                    <span class="andes-ui-badge andes-ui-badge--medium" :class="statusBadgeClass(d.status)">
                        <span class="andes-ui-badge__content">{{ statusLabel(d.status) }}</span>
                    </span>
                    <AndesMoney :value="(Number(d.amount_cents) || 0) / 100" size="medium" cents="comma" />
                    <span class="andes-ui-list__item-chevron"><AndesIcon name="chevron-right" /></span>
                </span>
            </li>
        </ul>

        <div v-else class="andes-ui-card andes-ui-card--padding-large">
            <div class="andes-empty">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="shield" />
                </span>
                <b class="andes-ui-typography tp-heading-medium">Nenhuma disputa neste filtro.</b>
                <span class="andes-ui-typography tp-body-small c-secondary">
                    Contestações abertas pelo banco aparecem aqui com o prazo de defesa.
                </span>
            </div>
        </div>
    </div>
</template>
