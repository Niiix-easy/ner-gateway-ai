<script setup>
/**
 * Catálogo de produtos no design system Andes.
 *
 * A tela ganhou busca, filtros e ordenação no servidor (antes era só uma lista
 * paginada sem nenhum recorte), o estado do acervo vem no topo e cada linha
 * segue a anatomia do guia: miniatura · conteúdo · valor · ação.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import ProdutosTabs from '@/components/produtos/ProdutosTabs.vue';
import ProdutoCreateSidebar from '@/components/produtos/ProdutoCreateSidebar.vue';
import AndesFilterMenu from '@/components/andes/AndesFilterMenu.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { useI18n } from '@/composables/useI18n';
import { htmlToText } from '@/lib/sanitizeHtml';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

defineOptions({ layout: LayoutInfoprodutor });
const { t } = useI18n();

const props = defineProps({
    produtos: { type: [Array, Object], default: () => [] },
    productTypes: { type: Array, default: () => [] },
    billingTypes: { type: Array, default: () => [] },
    exchange_rates: { type: Object, default: () => ({ brl_eur: 0.16, brl_usd: 0.18 }) },
    stats: { type: Object, default: () => ({ total: 0, ativos: 0, inativos: 0 }) },
    filters: { type: Object, default: () => ({ q: '', type: '', billing_type: '', status: 'all', sort: 'name' }) },
    plugin_card_actions: { type: Object, default: () => ({}) },
    plugin_form_sections: { type: Array, default: () => [] },
});

const produtosList = computed(() => props.produtos?.data ?? (Array.isArray(props.produtos) ? props.produtos : []));

const sidebarOpen = ref(false);
const openMenuId = ref(null);
const productToDelete = ref(null);
const copiedId = ref(null);

/* ---------- busca, filtros e ordenação (todos no servidor) ---------- */

const search = ref(props.filters?.q ?? '');
let searchTimer = null;

const typeOptions = computed(() => [
    { value: '', label: t('products.all_types', 'Todos os tipos') },
    ...props.productTypes.map((tp) => ({ value: tp.value, label: tp.label })),
]);

const billingOptions = computed(() => [
    { value: '', label: t('products.all_billings', 'Todas as cobranças') },
    ...props.billingTypes.map((b) => ({ value: b.value, label: b.label })),
]);

const statusOptions = [
    { value: 'all', label: 'Ativos e inativos' },
    { value: 'active', label: 'Só ativos' },
    { value: 'inactive', label: 'Só inativos' },
];

const sortOptions = [
    { value: 'name', label: 'Nome (A–Z)' },
    { value: 'recent', label: 'Mais recentes' },
    { value: 'price_desc', label: 'Maior preço' },
    { value: 'price_asc', label: 'Menor preço' },
];

function applyQuery(overrides = {}) {
    const query = {
        q: search.value,
        type: props.filters?.type ?? '',
        billing_type: props.filters?.billing_type ?? '',
        status: props.filters?.status ?? 'all',
        sort: props.filters?.sort ?? 'name',
        ...overrides,
    };

    const cleaned = {};
    Object.entries(query).forEach(([k, v]) => {
        if (v === '' || v == null) return;
        if (k === 'status' && v === 'all') return;
        if (k === 'sort' && v === 'name') return;
        cleaned[k] = v;
    });

    router.get('/produtos', cleaned, { preserveState: true, preserveScroll: true, replace: true });
}

function onSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        applyQuery();
        searchTimer = null;
    }, 500);
}

function clearFilters() {
    search.value = '';
    router.get('/produtos', {}, { preserveState: true, preserveScroll: true, replace: true });
}

/* O que está filtrando, em fichas removíveis. */
const appliedChips = computed(() => {
    const chips = [];
    const f = props.filters ?? {};

    if (f.q) {
        chips.push({ key: 'q', label: `"${f.q}"`, clear: () => { search.value = ''; applyQuery({ q: '' }); } });
    }
    if (f.type) {
        const label = props.productTypes.find((tp) => tp.value === f.type)?.label ?? f.type;
        chips.push({ key: 'type', label, clear: () => applyQuery({ type: '' }) });
    }
    if (f.billing_type) {
        const label = props.billingTypes.find((b) => b.value === f.billing_type)?.label ?? f.billing_type;
        chips.push({ key: 'billing', label, clear: () => applyQuery({ billing_type: '' }) });
    }
    if (f.status && f.status !== 'all') {
        chips.push({
            key: 'status',
            label: f.status === 'active' ? 'Só ativos' : 'Só inativos',
            clear: () => applyQuery({ status: 'all' }),
        });
    }

    return chips;
});

/* ---------- linha ---------- */

function toggleMenu(id, event) {
    event.stopPropagation();
    openMenuId.value = openMenuId.value === id ? null : id;
}

function closeMenu() {
    openMenuId.value = null;
}

function handleClickOutside(event) {
    if (openMenuId.value == null) return;
    const menuEl = document.querySelector(`[data-product-menu="${openMenuId.value}"]`);
    if (menuEl && !menuEl.contains(event.target)) {
        closeMenu();
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    if (searchTimer) clearTimeout(searchTimer);
});

function openSidebar() {
    sidebarOpen.value = true;
}

function closeSidebar() {
    sidebarOpen.value = false;
}

function editProduct(p) {
    router.visit(`/produtos/${p.id}/edit`);
}

function duplicate(p) {
    router.post(`/produtos/${p.id}/duplicate`, {}, { preserveScroll: true });
    closeMenu();
}

function openDeleteModal(p) {
    closeMenu();
    productToDelete.value = p;
}

function closeDeleteModal() {
    productToDelete.value = null;
}

function confirmDestroy() {
    const p = productToDelete.value;
    if (!p) return;
    router.delete(`/produtos/${p.id}`, { preserveScroll: true });
    closeDeleteModal();
}

function pluginActions(productId) {
    return props.plugin_card_actions?.[productId] ?? [];
}

/* Linha de apoio do produto: tipo, cobrança e quando entrou. */
function productLine(p) {
    const partes = [p.type_label, p.billing_type_label ?? 'Pagamento único'];
    if (p.created_at) {
        const d = new Date(p.created_at);
        partes.push(`criado em ${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}`);
    }
    return partes.filter(Boolean).join(' · ');
}

/* Produto cobrado em outra moeda mostra o valor original e o equivalente. */
function precoOriginal(p) {
    const moeda = p.currency ?? 'BRL';
    if (moeda === 'BRL') return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(Number(p.price) || 0);
}

async function copyCheckout(p, event) {
    event.stopPropagation();
    const url = `${window.location.origin}/c/${p.checkout_slug}`;
    try {
        await navigator.clipboard.writeText(url);
        copiedId.value = p.id;
        setTimeout(() => {
            if (copiedId.value === p.id) copiedId.value = null;
        }, 2000);
    } catch {
        copiedId.value = null;
    }
    closeMenu();
}

/* Rolagem da página trava enquanto o diálogo está aberto. */
useBodyScrollLock(() => productToDelete.value !== null);
</script>

<template>
    <div class="andes-dash andes-prod">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">{{ t('sidebar.products', 'Produtos') }}</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                {{ t('products.subtitle', 'Gerencie seus produtos, ofertas e acessos de checkout.') }}
            </p>
        </header>

        <ProdutosTabs />

        <div class="andes-summary">
            <span class="andes-summary__item"><b>{{ stats.total }}</b> {{ stats.total === 1 ? 'produto' : 'produtos' }}</span>
            <span class="andes-summary__item"><b>{{ stats.ativos }}</b> ativos</span>
            <span class="andes-summary__item"><b>{{ stats.inativos }}</b> inativos</span>
        </div>

        <!-- Busca -->
        <div class="andes-search andes-prod__search">
            <span class="andes-search__icon"><AndesIcon name="search" /></span>
            <input
                v-model="search"
                type="text"
                class="andes-ui-input"
                :placeholder="t('products.search_placeholder', 'Buscar por nome ou link do checkout...')"
                @input="onSearchInput"
            />
            <button
                v-if="search"
                type="button"
                class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button andes-search__clear"
                style="width: 32px; height: 32px; min-height: 32px"
                :aria-label="t('common.clear_search', 'Limpar busca')"
                @click="search = ''; applyQuery({ q: '' })"
            >
                <AndesIcon name="close" />
            </button>
        </div>

        <div class="andes-filterbar">
            <AndesFilterMenu
                :label="t('products.type', 'Tipo')"
                icon="archive"
                :options="typeOptions"
                :model-value="filters.type"
                neutral-value=""
                width="260px"
                @change="(v) => applyQuery({ type: v })"
            />
            <AndesFilterMenu
                :label="t('products.billing', 'Cobrança')"
                icon="card"
                :options="billingOptions"
                :model-value="filters.billing_type"
                neutral-value=""
                width="260px"
                @change="(v) => applyQuery({ billing_type: v })"
            />
            <AndesFilterMenu
                :label="t('common.status', 'Estado')"
                icon="check"
                :options="statusOptions"
                :model-value="filters.status"
                neutral-value="all"
                @change="(v) => applyQuery({ status: v })"
            />
            <div class="andes-filterbar__end">
                <AndesFilterMenu
                    :label="t('common.sort', 'Ordenar')"
                    icon="filters"
                    :options="sortOptions"
                    :model-value="filters.sort"
                    neutral-value="name"
                    align-end
                    @change="(v) => applyQuery({ sort: v })"
                />
                <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" @click="openSidebar">
                    <AndesIcon name="plus" />
                    {{ t('products.new', 'Criar produto') }}
                </button>
            </div>
        </div>

        <div v-if="appliedChips.length" class="andes-chips">
            <span v-for="chip in appliedChips" :key="chip.key" class="andes-chip">
                <span :title="chip.label">{{ chip.label }}</span>
                <button type="button" :aria-label="`Remover ${chip.label}`" @click="chip.clear()">
                    <AndesIcon name="close" />
                </button>
            </span>
            <button type="button" class="andes-ui-textlink andes-ui-textlink--small" @click="clearFilters">
                {{ t('common.clear_filters', 'Limpar filtros') }}
            </button>
        </div>

        <!-- Lista dentro do painel, como a página 3 do guia -->
        <div v-if="produtosList.length" class="andes-ui-card andes-ui-card--padding-none andes-panel">
            <div class="andes-panel__head">
                <b class="andes-ui-typography tp-heading-medium">{{ t('products.tab_products', 'Produtos') }}</b>
                <span class="andes-ui-badge andes-ui-badge--large andes-ui-badge--neutral-quiet">
                    <span class="andes-ui-badge__content">{{ produtosList.length }} nesta página</span>
                </span>
            </div>

            <ul class="andes-ui-list andes-panel__list">
                <li
                    v-for="p in produtosList"
                    :key="p.id"
                    class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                    :class="{ 'andes-prod__row--off': !p.is_active }"
                    role="button"
                    tabindex="0"
                    @click="editProduct(p)"
                    @keydown.enter.prevent="editProduct(p)"
                >
                    <div class="andes-ui-list__item-content">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                            <img v-if="p.image_url" :src="p.image_url" :alt="p.name" />
                            <AndesIcon v-else name="archive" />
                        </span>
                        <span class="andes-dash__list-main">
                            <span class="andes-ui-typography tp-body-medium w-emphasis andes-prod__name">{{ p.name }}</span>
                            <span class="andes-ui-typography tp-body-small c-secondary">{{ productLine(p) }}</span>
                            <a
                                v-if="p.checkout_slug"
                                :href="`/c/${p.checkout_slug}`"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="andes-ui-textlink andes-ui-textlink--small"
                                @click.stop
                            >
                                /c/{{ p.checkout_slug }}
                                <AndesIcon name="link" />
                            </a>
                        </span>
                    </div>
                    <span class="andes-dash__list-values" @click.stop>
                        <span v-if="!p.is_active" class="andes-ui-badge andes-ui-badge--medium andes-ui-badge--neutral-quiet">
                            <span class="andes-ui-badge__content">{{ t('common.inactive', 'Inativo') }}</span>
                        </span>
                        <span class="andes-prod__price">
                            <AndesMoney :value="Number(p.price_brl ?? p.price) || 0" size="large" cents="comma" />
                            <span v-if="precoOriginal(p)" class="andes-ui-typography tp-body-small c-secondary">
                                {{ precoOriginal(p) }}
                            </span>
                        </span>
                        <Link
                            :href="`/produtos/${p.id}/edit`"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            :aria-label="`${t('common.edit', 'Editar')} ${p.name}`"
                            :title="t('common.edit', 'Editar produto')"
                        >
                            <AndesIcon name="pencil" />
                        </Link>
                        <button
                            v-if="p.checkout_slug"
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            :aria-label="t('products.copy_checkout', 'Copiar link do checkout')"
                            :title="t('products.copy_checkout', 'Copiar link do checkout')"
                            @click="copyCheckout(p, $event)"
                        >
                            <AndesIcon :name="copiedId === p.id ? 'check' : 'copy'" />
                        </button>
                        <div class="andes-menu" :data-product-menu="p.id">
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                                style="width: 32px; height: 32px; min-height: 32px"
                                :aria-label="t('common.open_menu', 'Abrir menu')"
                                :aria-expanded="openMenuId === p.id ? 'true' : 'false'"
                                @click="toggleMenu(p.id, $event)"
                            >
                                <AndesIcon name="filters" />
                            </button>
                            <div v-show="openMenuId === p.id" class="andes-menu__list">
                                <Link :href="`/produtos/${p.id}/edit`" class="andes-menu__item" @click="closeMenu">
                                    <AndesIcon name="pencil" />
                                    {{ t('common.edit', 'Editar') }}
                                </Link>
                                <button type="button" class="andes-menu__item" @click="duplicate(p)">
                                    <AndesIcon name="copy" />
                                    {{ t('common.duplicate', 'Duplicar') }}
                                </button>
                                <button type="button" class="andes-menu__item andes-menu__item--danger" @click="openDeleteModal(p)">
                                    <AndesIcon name="trash" />
                                    {{ t('common.delete', 'Excluir') }}
                                </button>
                                <template v-for="(action, actIdx) in pluginActions(p.id)" :key="`plugin-${p.id}-${actIdx}`">
                                    <a v-if="action.href" :href="action.href" class="andes-menu__item" @click="closeMenu">
                                        <AndesIcon name="link" />
                                        {{ action.label }}
                                    </a>
                                    <span v-else class="andes-menu__label">{{ action.label }}</span>
                                </template>
                            </div>
                        </div>
                    </span>
                </li>
            </ul>

            <div v-if="produtos?.links?.length > 3" class="andes-panel__foot">
                <nav class="andes-pagination" aria-label="Paginação">
                    <a
                        v-for="link in produtos.links"
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
        </div>

        <div v-else class="andes-ui-card andes-ui-card--padding-large andes-panel">
            <div class="andes-empty">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="archive" />
                </span>
                <b class="andes-ui-typography tp-heading-medium">
                    {{ appliedChips.length
                        ? t('products.empty_filtered', 'Nenhum produto bate com esses filtros.')
                        : t('products.empty', 'Nenhum produto ainda.') }}
                </b>
                <span class="andes-ui-typography tp-body-small c-secondary">
                    {{ appliedChips.length
                        ? t('products.empty_filtered_hint', 'Tente outro tipo de cobrança ou limpe a busca.')
                        : t('products.empty_hint', 'Crie um produto para gerar o checkout e começar a vender.') }}
                </span>
                <button
                    type="button"
                    class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                    style="margin-top: 12px"
                    @click="appliedChips.length ? clearFilters() : openSidebar()"
                >
                    <AndesIcon :name="appliedChips.length ? 'refresh' : 'plus'" />
                    {{ appliedChips.length ? t('common.clear_filters', 'Limpar filtros') : t('products.create_first', 'Criar primeiro produto') }}
                </button>
            </div>
        </div>

        <!-- Exclusão -->
        <Teleport to="body">
            <div
                v-if="productToDelete"
                class="andes-dash andes-modal"
                style="z-index: 100002"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-modal-title"
            >
                <div class="andes-modal__veil" aria-hidden="true" @click="closeDeleteModal" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card" style="max-width: 400px">
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="trash" />
                        </span>
                        <b id="delete-modal-title" class="andes-ui-typography tp-heading-large">Excluir produto?</b>
                    </div>
                    <p class="andes-ui-typography tp-body-medium c-secondary" style="margin-bottom: 20px">
                        Tem certeza que deseja excluir <b class="w-emphasis">"{{ productToDelete?.name }}"</b>?
                        O checkout sai do ar e a ação não pode ser desfeita.
                    </p>
                    <div class="andes-actions">
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="closeDeleteModal">
                            Cancelar
                        </button>
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud andes-ui-button--danger" @click="confirmDestroy">
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <ProdutoCreateSidebar
            :open="sidebarOpen"
            :product-types="productTypes"
            :billing-types="billingTypes"
            :exchange-rates="exchange_rates"
            :plugin-form-sections="plugin_form_sections"
            @close="closeSidebar"
            @success="closeSidebar"
        />
    </div>
</template>
