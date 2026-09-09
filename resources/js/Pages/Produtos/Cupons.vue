<script setup>
/**
 * Cupons no design system Andes.
 *
 * Cupom não é item de catálogo — é regra com ciclo de vida. Por isso esta tela
 * não repete a lista de Produtos: são cartões em grade, com o estado calculado
 * (valendo, agendado, esgotado, encerrado, pausado), a barra de uso do guia e
 * o código como identidade da peça.
 */
import { ref, computed } from 'vue';
import { router } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import CupomSidebar from '@/components/produtos/CupomSidebar.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { useI18n } from '@/composables/useI18n';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

defineOptions({ layout: LayoutInfoprodutor });
const { t } = useI18n();

const props = defineProps({
    cupons: { type: Array, default: () => [] },
    produtos: { type: Array, default: () => [] },
});

const sidebarOpen = ref(false);
const couponToEdit = ref(null);
const couponToDelete = ref(null);
const copiedCode = ref(null);
const search = ref('');
const estadoFiltro = ref('all');

/* ---------- ciclo de vida do cupom ---------- */

const ESTADOS = {
    live: { label: 'Valendo', badge: 'andes-ui-badge--positive-quiet', icon: 'check' },
    scheduled: { label: 'Agendado', badge: 'andes-ui-badge--informative-quiet', icon: 'calendar' },
    exhausted: { label: 'Esgotado', badge: 'andes-ui-badge--caution-quiet', icon: 'filters' },
    expired: { label: 'Encerrado', badge: 'andes-ui-badge--neutral-quiet', icon: 'calendar' },
    paused: { label: 'Pausado', badge: 'andes-ui-badge--neutral-quiet', icon: 'eye-closed' },
};

function estadoDe(c) {
    if (!c.is_active) return 'paused';
    const agora = new Date();
    if (c.valid_from && new Date(c.valid_from) > agora) return 'scheduled';
    if (c.valid_until && new Date(c.valid_until) < agora) return 'expired';
    if (c.max_uses != null && Number(c.used_count) >= Number(c.max_uses)) return 'exhausted';
    return 'live';
}

const cuponsComEstado = computed(() => props.cupons.map((c) => ({ ...c, estado: estadoDe(c) })));

const contagem = computed(() => {
    const base = { all: cuponsComEstado.value.length, live: 0, scheduled: 0, paused: 0, closed: 0 };
    cuponsComEstado.value.forEach((c) => {
        if (c.estado === 'live') base.live += 1;
        else if (c.estado === 'scheduled') base.scheduled += 1;
        else if (c.estado === 'paused') base.paused += 1;
        else base.closed += 1;
    });
    return base;
});

const estadoOpcoes = computed(() => [
    { value: 'all', label: 'Todos', count: contagem.value.all },
    { value: 'live', label: 'Valendo', count: contagem.value.live },
    { value: 'scheduled', label: 'Agendados', count: contagem.value.scheduled },
    { value: 'paused', label: 'Pausados', count: contagem.value.paused },
    { value: 'closed', label: 'Encerrados', count: contagem.value.closed },
]);

const cuponsFiltrados = computed(() => {
    const termo = search.value.trim().toLowerCase();
    return cuponsComEstado.value.filter((c) => {
        if (estadoFiltro.value === 'closed' && !['expired', 'exhausted'].includes(c.estado)) return false;
        if (!['all', 'closed'].includes(estadoFiltro.value) && c.estado !== estadoFiltro.value) return false;
        if (termo && !String(c.code ?? '').toLowerCase().includes(termo)) return false;
        return true;
    });
});

const temRecorte = computed(() => search.value.trim() !== '' || estadoFiltro.value !== 'all');

function limparRecorte() {
    search.value = '';
    estadoFiltro.value = 'all';
}

/* ---------- leitura de cada cartão ---------- */

function descontoValor(c) {
    return c.type === 'percent' ? `${Number(c.value)}%` : null;
}

function alcanceLabel(c) {
    const nomes = c.product_names ?? [];
    if (!nomes.length) return 'Todos os produtos';
    if (nomes.length === 1) return nomes[0];
    return `${nomes.length} produtos`;
}

function usoLabel(c) {
    const usos = Number(c.used_count) || 0;
    if (c.max_uses == null) return `${usos} ${usos === 1 ? 'uso' : 'usos'} · sem limite`;
    return `${usos} de ${c.max_uses} usos`;
}

function usoPercent(c) {
    if (c.max_uses == null || Number(c.max_uses) <= 0) return null;
    return Math.min(Math.round(((Number(c.used_count) || 0) / Number(c.max_uses)) * 100), 100);
}

function dataCurta(iso) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}

function prazoLabel(c) {
    if (c.valid_from && new Date(c.valid_from) > new Date()) return `Começa em ${dataCurta(c.valid_from)}`;
    if (c.valid_until) return `Até ${dataCurta(c.valid_until)}`;
    return 'Sem prazo';
}

function minimoLabel(c) {
    if (c.min_amount == null) return null;
    return `Mínimo ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.min_amount)}`;
}

/* ---------- ações ---------- */

function openNew() {
    couponToEdit.value = null;
    sidebarOpen.value = true;
}

function openEdit(c) {
    couponToEdit.value = c;
    sidebarOpen.value = true;
}

function closeSidebar() {
    sidebarOpen.value = false;
    couponToEdit.value = null;
}

function openDeleteModal(c) {
    couponToDelete.value = c;
}

function closeDeleteModal() {
    couponToDelete.value = null;
}

function confirmDestroy() {
    const c = couponToDelete.value;
    if (!c) return;
    router.delete(`/produtos/cupons/${c.id}`, { preserveScroll: true });
    closeDeleteModal();
}

async function copiarCodigo(c) {
    try {
        await navigator.clipboard.writeText(c.code);
        copiedCode.value = c.id;
        setTimeout(() => {
            if (copiedCode.value === c.id) copiedCode.value = null;
        }, 2000);
    } catch {
        copiedCode.value = null;
    }
}

/* Rolagem da página trava enquanto o diálogo está aberto. */
useBodyScrollLock(() => couponToDelete.value !== null);
</script>

<template>
    <div class="andes-dash andes-cup">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">{{ t('sidebar.coupons', 'Cupons') }}</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                {{ t('coupons.subtitle', 'Crie e gerencie cupons de desconto para seus produtos.') }}
            </p>
        </header>

        <!-- O recorte por estado já é o resumo: cada ficha traz a contagem -->
        <div class="andes-cup__states">
            <button
                v-for="opt in estadoOpcoes"
                :key="opt.value"
                type="button"
                class="andes-chip andes-chip--action andes-cup__state"
                :class="{ 'andes-chip--on': estadoFiltro === opt.value }"
                :aria-pressed="estadoFiltro === opt.value ? 'true' : 'false'"
                @click="estadoFiltro = opt.value"
            >
                {{ opt.label }}
                <b>{{ opt.count }}</b>
            </button>

            <div class="andes-cup__states-end">
                <div class="andes-search andes-cup__search">
                    <span class="andes-search__icon"><AndesIcon name="search" /></span>
                    <input v-model="search" type="text" class="andes-ui-input" placeholder="Buscar código..." />
                    <button
                        v-if="search"
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button andes-search__clear"
                        style="width: 32px; height: 32px; min-height: 32px"
                        aria-label="Limpar busca"
                        @click="search = ''"
                    >
                        <AndesIcon name="close" />
                    </button>
                </div>
                <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" @click="openNew">
                    <AndesIcon name="plus" />
                    {{ t('coupons.new', 'Criar cupom') }}
                </button>
            </div>
        </div>

        <!-- Grade de cupons -->
        <div v-if="cuponsFiltrados.length" class="andes-cup__grid">
            <article
                v-for="c in cuponsFiltrados"
                :key="c.id"
                class="andes-ui-card andes-ui-card--padding-large andes-cup__card"
                :class="{ 'andes-cup__card--off': ['expired', 'paused', 'exhausted'].includes(c.estado) }"
            >
                <div class="andes-cup__card-top">
                    <b class="andes-ui-typography tp-heading-large andes-cup__code">{{ c.code }}</b>
                    <span class="andes-ui-badge andes-ui-badge--medium" :class="ESTADOS[c.estado].badge">
                        <span class="andes-ui-badge__content">{{ ESTADOS[c.estado].label }}</span>
                    </span>
                </div>

                <div class="andes-cup__discount">
                    <b v-if="descontoValor(c)" class="andes-ui-typography tp-heading-huge">{{ descontoValor(c) }}</b>
                    <AndesMoney v-else :value="Number(c.value) || 0" size="xhuge" cents="comma" />
                    <span class="andes-ui-typography tp-body-small c-secondary">de desconto</span>
                </div>

                <div class="andes-cup__facts">
                    <span class="andes-cup__fact">
                        <AndesIcon name="archive" />
                        {{ alcanceLabel(c) }}
                    </span>
                    <span class="andes-cup__fact">
                        <AndesIcon name="calendar" />
                        {{ prazoLabel(c) }}
                    </span>
                    <span v-if="minimoLabel(c)" class="andes-cup__fact">
                        <AndesIcon name="hand-money" />
                        {{ minimoLabel(c) }}
                    </span>
                </div>

                <div class="andes-cup__uses">
                    <span class="andes-ui-typography tp-body-small c-secondary">{{ usoLabel(c) }}</span>
                    <div v-if="usoPercent(c) !== null" class="andes-progress" role="presentation">
                        <div class="andes-progress__bar" :style="{ width: `${usoPercent(c)}%` }" />
                    </div>
                </div>

                <div class="andes-cup__actions">
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--quiet"
                        @click="copiarCodigo(c)"
                    >
                        <AndesIcon :name="copiedCode === c.id ? 'check' : 'copy'" />
                        {{ copiedCode === c.id ? 'Copiado' : 'Copiar código' }}
                    </button>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                        style="width: 32px; height: 32px; min-height: 32px; margin-left: auto"
                        :aria-label="`${t('coupons.edit', 'Editar cupom')} ${c.code}`"
                        @click="openEdit(c)"
                    >
                        <AndesIcon name="pencil" />
                    </button>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                        style="width: 32px; height: 32px; min-height: 32px"
                        :aria-label="`${t('coupons.delete', 'Excluir cupom')} ${c.code}`"
                        @click="openDeleteModal(c)"
                    >
                        <AndesIcon name="trash" />
                    </button>
                </div>
            </article>
        </div>

        <div v-else class="andes-ui-card andes-ui-card--padding-large">
            <div class="andes-empty">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="clipboard-check" />
                </span>
                <b class="andes-ui-typography tp-heading-medium">
                    {{ temRecorte ? 'Nenhum cupom neste recorte.' : t('coupons.empty', 'Nenhum cupom ainda.') }}
                </b>
                <span class="andes-ui-typography tp-body-small c-secondary">
                    {{ temRecorte
                        ? 'Tente outro código ou volte para todos os estados.'
                        : t('coupons.empty_hint', 'Um cupom desconta no checkout assim que o comprador digita o código.') }}
                </span>
                <button
                    type="button"
                    class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                    style="margin-top: 12px"
                    @click="temRecorte ? limparRecorte() : openNew()"
                >
                    <AndesIcon :name="temRecorte ? 'refresh' : 'plus'" />
                    {{ temRecorte ? 'Limpar recorte' : t('coupons.create_first', 'Criar primeiro cupom') }}
                </button>
            </div>
        </div>

        <!-- Exclusão -->
        <Teleport to="body">
            <div
                v-if="couponToDelete"
                class="andes-dash andes-modal"
                style="z-index: 100002"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-cupom-title"
            >
                <div class="andes-modal__veil" aria-hidden="true" @click="closeDeleteModal" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card" style="max-width: 400px">
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="trash" />
                        </span>
                        <b id="delete-cupom-title" class="andes-ui-typography tp-heading-large">
                            {{ t('coupons.delete_title', 'Excluir cupom?') }}
                        </b>
                    </div>
                    <p class="andes-ui-typography tp-body-medium c-secondary" style="margin-bottom: 20px">
                        {{ t('coupons.delete_confirm', 'Tem certeza que deseja excluir o cupom') }}
                        <b class="w-emphasis">"{{ couponToDelete?.code }}"</b>?
                        {{ t('common.irreversible_action', 'Esta ação não pode ser desfeita.') }}
                    </p>
                    <div class="andes-actions">
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="closeDeleteModal">
                            {{ t('common.cancel', 'Cancelar') }}
                        </button>
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud andes-ui-button--danger" @click="confirmDestroy">
                            {{ t('common.delete', 'Excluir') }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <CupomSidebar
            :open="sidebarOpen"
            :produtos="produtos"
            :coupon="couponToEdit"
            :existing-codes="cupons.map((c) => c.code)"
            @close="closeSidebar"
            @success="closeSidebar"
        />
    </div>
</template>
