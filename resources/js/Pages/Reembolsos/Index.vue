<script setup>
/**
 * Solicitações de reembolso no design system Andes.
 * Uma ação loud por linha (Aprovar), a recusa em mute, e o bloqueio por MED
 * escrito no lugar de um aviso solto em laranja.
 */
import { computed, ref, watch } from 'vue';
import { router, useForm, usePage } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import VendasTabs from '@/components/vendas/VendasTabs.vue';
import AndesFilterMenu from '@/components/andes/AndesFilterMenu.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { htmlToText } from '@/lib/sanitizeHtml';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

defineOptions({ layout: LayoutInfoprodutor });

const props = defineProps({
    requests: { type: Object, required: true },
    filter_status: { type: String, default: 'pending' },
    order_ids_with_open_med: { type: Array, default: () => [] },
});

const openMedSet = computed(() => new Set(props.order_ids_with_open_med ?? []));

function hasOpenMed(rr) {
    return openMedSet.value.has(rr.order_id);
}

const page = usePage();
const rows = computed(() => props.requests?.data ?? []);
const rejectOpen = ref(false);
const rejectId = ref(null);

const rejectForm = useForm({
    reason: '',
});

const statusTabs = [
    { value: 'pending', label: 'Pendentes' },
    { value: 'approved', label: 'Aprovados' },
    { value: 'rejected', label: 'Recusados' },
    { value: 'all', label: 'Todos' },
];

watch(
    () => props.filter_status,
    () => {
        rejectOpen.value = false;
    }
);

const STATUS_LABEL = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Recusado' };

const STATUS_BADGE = {
    pending: 'andes-ui-badge--caution-quiet',
    approved: 'andes-ui-badge--positive-quiet',
    rejected: 'andes-ui-badge--negative-quiet',
};

function statusLabel(s) {
    return STATUS_LABEL[s] ?? s ?? '—';
}

function statusBadgeClass(s) {
    return STATUS_BADGE[s] ?? 'andes-ui-badge--neutral-quiet';
}

/* Quanto está parado esperando decisão — o número que move esta tela. */
const pendingTotal = computed(() =>
    rows.value
        .filter((rr) => rr.status === 'pending')
        .reduce((sum, rr) => sum + (Number(rr.order?.amount) || 0), 0),
);

const pendingCount = computed(() => rows.value.filter((rr) => rr.status === 'pending').length);

function setFilter(status) {
    router.get(
        '/vendas/reembolsos',
        { status },
        { preserveState: true, preserveScroll: true, replace: true }
    );
}

function approve(rr) {
    if (hasOpenMed(rr)) {
        alert('Reembolso bloqueado: existe disputa MED aberta neste pedido. Resolva em Disputas MED.');
        return;
    }
    if (!confirm(`Aprovar reembolso do pedido #${rr.order_id}?`)) return;
    router.post(`/vendas/reembolsos/${rr.id}/aprovar`, {}, { preserveScroll: true });
}

function openReject(rr) {
    rejectId.value = rr.id;
    rejectForm.reason = '';
    rejectForm.clearErrors();
    rejectOpen.value = true;
}

function closeReject() {
    rejectOpen.value = false;
    rejectId.value = null;
}

function submitReject() {
    if (!rejectId.value) return;
    rejectForm.post(`/vendas/reembolsos/${rejectId.value}/recusar`, {
        preserveScroll: true,
        onSuccess: () => closeReject(),
    });
}

/* Rolagem da página trava enquanto o diálogo está aberto. */
useBodyScrollLock(() => rejectOpen.value);
</script>

<template>
    <div class="andes-dash andes-ref">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">Reembolsos</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                Solicitações abertas pelos seus compradores, para aprovar ou recusar.
            </p>
        </header>

        <VendasTabs />

        <div v-if="page.props.flash?.success" class="andes-ui-message andes-ui-message--positive andes-block--tight">
            <span class="andes-ui-message__text">{{ page.props.flash.success }}</span>
        </div>
        <div v-if="page.props.flash?.error" class="andes-ui-message andes-ui-message--negative andes-block--tight">
            <span class="andes-ui-message__text">{{ page.props.flash.error }}</span>
        </div>

        <div class="andes-ui-card andes-ui-card--padding-huge andes-block--tight">
            <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 4px">Esperando sua decisão</div>
            <div class="andes-dash__hero-value">
                <AndesMoney :value="pendingTotal" size="xhuge" cents="sups" />
            </div>
            <div class="andes-ui-typography tp-body-small c-secondary" style="margin-top: 6px">
                {{ pendingCount }} {{ pendingCount === 1 ? 'solicitação pendente' : 'solicitações pendentes' }}
            </div>
        </div>

        <div class="andes-filterbar">
            <AndesFilterMenu
                label="Estado"
                icon="filters"
                :options="statusTabs"
                :model-value="filter_status"
                neutral-value="all"
                @change="setFilter"
            />
        </div>

        <ul v-if="rows.length" class="andes-ui-list andes-dash__list">
            <li
                v-for="rr in rows"
                :key="rr.id"
                class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
            >
                <div class="andes-ui-list__item-content">
                    <span class="andes-thumb">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="import" />
                        </span>
                        <span
                            v-if="hasOpenMed(rr)"
                            class="andes-ui-badge andes-ui-badge--small andes-ui-badge--caution andes-thumb__mark"
                            aria-hidden="true"
                        />
                    </span>
                    <span class="andes-dash__list-main">
                        <span class="andes-ui-typography tp-body-medium w-emphasis">
                            {{ rr.user?.name ?? '—' }}
                        </span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ rr.user?.email }} · pedido #{{ rr.order_id }}
                        </span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ statusLabel(rr.status) }} · {{ rr.order?.product?.name ?? '—' }}
                        </span>
                        <span v-if="rr.customer_reason" class="andes-ui-typography tp-body-small c-secondary" :title="rr.customer_reason">
                            Motivo: {{ rr.customer_reason }}
                        </span>
                        <span v-if="hasOpenMed(rr)" class="andes-ui-badge andes-ui-badge--medium andes-ui-badge--caution-quiet" style="margin-top: 4px">
                            <span class="andes-ui-badge__content">Bloqueado por disputa MED aberta</span>
                        </span>
                    </span>
                </div>
                <span class="andes-dash__list-values">
                    <span class="andes-ui-badge andes-ui-badge--medium" :class="statusBadgeClass(rr.status)">
                        <span class="andes-ui-badge__content">{{ statusLabel(rr.status) }}</span>
                    </span>
                    <AndesMoney v-if="rr.order?.amount != null" :value="Number(rr.order.amount) || 0" size="medium" cents="comma" />
                    <template v-if="rr.status === 'pending'">
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute"
                            @click="openReject(rr)"
                        >
                            Recusar
                        </button>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--loud"
                            :disabled="hasOpenMed(rr)"
                            @click="approve(rr)"
                        >
                            Aprovar
                        </button>
                    </template>
                </span>
            </li>
        </ul>

        <div v-else class="andes-ui-card andes-ui-card--padding-large">
            <div class="andes-empty">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="import" />
                </span>
                <b class="andes-ui-typography tp-heading-medium">Nenhuma solicitação neste filtro.</b>
                <span class="andes-ui-typography tp-body-small c-secondary">
                    Pedidos de reembolso feitos pelos compradores aparecem aqui para aprovação.
                </span>
            </div>
        </div>

        <nav v-if="(requests?.links?.length ?? 0) > 3" class="andes-pagination" aria-label="Paginação">
            <a
                v-for="link in requests.links"
                :key="link.label + String(link.url)"
                :href="link.url || undefined"
                :aria-current="link.active ? 'page' : undefined"
                :aria-disabled="!link.url"
                class="andes-pagination__item"
                :class="[link.active && 'andes-pagination__item--active', !link.url && 'andes-pagination__item--disabled']"
                v-text="htmlToText(link.label)"
                @click.prevent="link.url && router.visit(link.url, { preserveState: true, preserveScroll: true })"
            />
        </nav>

        <Teleport to="body">
            <div
                v-if="rejectOpen"
                class="andes-dash andes-modal"
                style="z-index: 200000"
                role="dialog"
                aria-modal="true"
                @click.self="closeReject"
            >
                <div class="andes-modal__veil" @click="closeReject" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card" @click.stop>
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="close" />
                        </span>
                        <b class="andes-ui-typography tp-heading-large">Recusar reembolso</b>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            aria-label="Fechar"
                            @click="closeReject"
                        >
                            <AndesIcon name="close" />
                        </button>
                    </div>
                    <div class="andes-form andes-form--wide">
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="recusa-motivo">Motivo</label>
                            <textarea
                                id="recusa-motivo"
                                v-model="rejectForm.reason"
                                rows="4"
                                class="andes-ui-input"
                                placeholder="Opcional. O cliente vê este texto."
                            />
                            <p v-if="rejectForm.errors.reason" class="andes-error">{{ rejectForm.errors.reason }}</p>
                        </div>
                        <div class="andes-actions">
                            <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="closeReject">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--medium andes-ui-button--loud andes-ui-button--danger"
                                :disabled="rejectForm.processing"
                                @click="submitReject"
                            >
                                Confirmar recusa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
