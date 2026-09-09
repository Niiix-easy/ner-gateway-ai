<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { router } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import AlunoDetailSidebar from '@/components/alunos/AlunoDetailSidebar.vue';
import AndesFilterMenu from '@/components/andes/AndesFilterMenu.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import axios from 'axios';
import { useI18n } from '@/composables/useI18n';
import { htmlToText } from '@/lib/sanitizeHtml';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

defineOptions({ layout: LayoutInfoprodutor });
const { t } = useI18n();

const props = defineProps({
    alunos: { type: [Array, Object], default: () => [] },
    produtos: { type: Array, default: () => [] },
    stats: { type: Object, default: () => ({}) },
    filter: { type: String, default: 'todos' },
    sort: { type: String, default: 'name' },
    product_ids_filter: { type: Array, default: () => [] },
    q: { type: String, default: '' },
});

const sidebarOpen = ref(false);
const selectedAluno = ref(null);
const novoAlunoModalOpen = ref(false);
const importModalOpen = ref(false);
const novoAlunoForm = ref({
    name: '',
    email: '',
    password: '',
    product_ids: [],
    send_access_email: true,
});
const savingNovo = ref(false);
const importForm = ref({ file: null, product_ids: [], send_access_email: true });
const importing = ref(false);
const toast = ref({ message: null, type: null });
let toastTimer = null;
let searchTimer = null;

const search = ref(props.q ?? '');

const filterOptions = [
    { value: 'todos', label: t('common.all', 'Todos') },
    { value: 'novos_30', label: t('students.new_30_days', 'Novos 30 dias') },
];

const alunosList = computed(() => props.alunos?.data ?? (Array.isArray(props.alunos) ? props.alunos : []));

const selectedProdutosLabels = computed(() => {
    const ids = props.product_ids_filter;
    return props.produtos.filter((p) => ids.includes(p.id)).map((p) => ({ id: p.id, name: p.name }));
});

function setFilter(value) {
    applyQuery({ filter: value });
}

function setProductFilter(ids) {
    applyQuery({ product_ids: ids });
}

function buildQuery(overrides = {}) {
    const q = {
        filter: props.filter,
        sort: props.sort,
        product_ids: props.product_ids_filter,
        q: search.value,
        ...overrides,
    };

    const cleaned = {};
    Object.entries(q).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (Array.isArray(v) && v.length === 0) return;
        if (typeof v === 'string' && v.trim() === '') return;
        if (k === 'filter' && v === 'todos') return;
        if (k === 'sort' && v === 'name') return;
        cleaned[k] = v;
    });
    return cleaned;
}

function applyQuery(overrides = {}) {
    router.get('/produtos/alunos', buildQuery(overrides), { preserveState: true, preserveScroll: true, replace: true });
}

function onSearchInput() {
    const q = (search.value ?? '').trim();
    if (q !== '' && q.length < 3) {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = null;
        return;
    }
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        applyQuery();
        searchTimer = null;
    }, 600);
}

function toggleProductFilter(id) {
    const current = [...(props.product_ids_filter ?? [])];
    const idx = current.indexOf(id);
    if (idx >= 0) {
        current.splice(idx, 1);
    } else {
        current.push(id);
    }
    setProductFilter(current);
}

function removeProductFilter(id) {
    const current = [...(props.product_ids_filter ?? [])].filter((x) => x !== id);
    setProductFilter(current);
}

const sortOptions = [
    { value: 'name', label: 'Nome (A–Z)' },
    { value: 'recent', label: 'Entraram por último' },
    { value: 'products', label: 'Mais produtos' },
];

function setSort(value) {
    applyQuery({ sort: value });
}

/* Pessoa = círculo com iniciais: cada linha ganha identidade própria. */
function iniciais(nome) {
    const limpo = String(nome ?? '').trim();
    if (!limpo) return '—';
    return limpo
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join('');
}

/* Quais produtos o aluno tem — dois nomes e o resto contado. */
function produtosLabel(a) {
    const nomes = (a.products ?? []).map((p) => p.name);
    if (!nomes.length) return 'Sem acesso a produtos';
    if (nomes.length <= 2) return nomes.join(' · ');
    return `${nomes.slice(0, 2).join(' · ')} +${nomes.length - 2}`;
}

function desdeLabel(a) {
    if (!a.joined_at) return null;
    const d = new Date(String(a.joined_at).replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return null;
    return `aluno desde ${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}`;
}

/* CSV sai com o mesmo recorte da tela. */
const exportUrl = computed(() => {
    const params = new URLSearchParams();
    const q = buildQuery();
    Object.entries(q).forEach(([k, v]) => {
        if (Array.isArray(v)) {
            v.forEach((id) => params.append('product_ids[]', String(id)));
            return;
        }
        params.append(k, String(v));
    });
    const query = params.toString();
    return `/produtos/alunos/export${query ? `?${query}` : ''}`;
});

/* Tudo que está filtrando, em fichas removíveis. */
const appliedChips = computed(() => {
    const chips = [];
    if (props.q) {
        chips.push({ key: 'q', label: `"${props.q}"`, clear: () => { search.value = ''; applyQuery({ q: '' }); } });
    }
    if (props.filter && props.filter !== 'todos') {
        const label = filterOptions.find((o) => o.value === props.filter)?.label ?? props.filter;
        chips.push({ key: 'filter', label, clear: () => setFilter('todos') });
    }
    selectedProdutosLabels.value.forEach((p) => {
        chips.push({ key: `p-${p.id}`, label: p.name, clear: () => removeProductFilter(p.id) });
    });
    return chips;
});

function limparRecorte() {
    search.value = '';
    router.get('/produtos/alunos', {}, { preserveState: true, preserveScroll: true, replace: true });
}

function openDetail(a) {
    selectedAluno.value = a;
    sidebarOpen.value = true;
}

function closeSidebar() {
    sidebarOpen.value = false;
    selectedAluno.value = null;
}

function handleAlunoUpdated(updated) {
    const list = [...alunosList.value];
    const idx = list.findIndex((a) => a.id === updated.id);
    if (idx >= 0) {
        list[idx] = { ...list[idx], ...updated };
        router.reload({ only: ['alunos'], preserveState: false });
    }
}

function handleAlunoDeleted(id) {
    closeSidebar();
    router.reload({ only: ['alunos', 'stats'], preserveState: false });
}

function openNovoAluno() {
    novoAlunoForm.value = { name: '', email: '', password: '', product_ids: [], send_access_email: true };
    novoAlunoModalOpen.value = true;
}

function closeNovoAluno() {
    novoAlunoModalOpen.value = false;
}

function openImportModal() {
    importForm.value = { file: null, product_ids: [], send_access_email: true };
    importModalOpen.value = true;
}

function closeImportModal() {
    importModalOpen.value = false;
}

function onImportFileChange(e) {
    const f = e.target?.files?.[0];
    importForm.value.file = f || null;
}

function toggleImportProduct(id) {
    const ids = importForm.value.product_ids;
    if (ids.includes(id)) {
        importForm.value.product_ids = ids.filter((x) => x !== id);
    } else {
        importForm.value.product_ids = [...ids, id];
    }
}

async function saveImport() {
    if (!importForm.value.file) {
        showToast(t('students.import.select_csv', 'Selecione um arquivo CSV.'), 'error');
        return;
    }
    if (!importForm.value.product_ids?.length) {
        showToast(t('students.import.select_product', 'Selecione ao menos um produto para dar acesso.'), 'error');
        return;
    }
    importing.value = true;
    try {
        const formData = new FormData();
        formData.append('file', importForm.value.file);
        formData.append('send_access_email', importForm.value.send_access_email ? '1' : '0');
        importForm.value.product_ids.forEach((id) => formData.append('product_ids[]', id));

        const { data } = await axios.post('/produtos/alunos/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast(data.message ?? t('students.import.done', 'Importação concluída.'), 'success');
        if (data.errors?.length) {
            showToast(data.errors.slice(0, 3).join(' '), 'error');
        }
        closeImportModal();
        router.reload({ only: ['alunos', 'stats'], preserveState: false });
    } catch (err) {
        showToast(
            err.response?.data?.message ?? err.response?.data?.errors?.file?.[0] ?? t('students.import.error', 'Erro na importação. Verifique o formato do CSV.'),
            'error'
        );
    } finally {
        importing.value = false;
    }
}

function toggleNovoProduct(id) {
    const ids = novoAlunoForm.value.product_ids;
    if (ids.includes(id)) {
        novoAlunoForm.value.product_ids = ids.filter((x) => x !== id);
    } else {
        novoAlunoForm.value.product_ids = [...ids, id];
    }
}

async function saveNovoAluno() {
    if (!novoAlunoForm.value.name?.trim() || !novoAlunoForm.value.email?.trim() || !novoAlunoForm.value.password) {
        showToast(t('students.new.required_fields', 'Preencha nome, e-mail e senha.'), 'error');
        return;
    }
    savingNovo.value = true;
    try {
        const { data } = await axios.post('/produtos/alunos', {
            ...novoAlunoForm.value,
            send_access_email: novoAlunoForm.value.send_access_email ?? true,
        });
        showToast(data.message ?? t('students.new.success', 'Aluno cadastrado com sucesso.'), 'success');
        closeNovoAluno();
        router.reload({ only: ['alunos', 'stats'], preserveState: false });
    } catch (err) {
        showToast(
            err.response?.data?.message ?? err.response?.data?.errors?.email?.[0] ?? t('students.new.error', 'Erro ao cadastrar. Tente novamente.'),
            'error'
        );
    } finally {
        savingNovo.value = false;
    }
}

function showToast(message, type) {
    toast.value = { message, type };
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.value = { message: null, type: null };
        toastTimer = null;
    }, 4000);
}

function displayNumber(value) {
    return String(value ?? 0);
}

onUnmounted(() => {
    if (toastTimer) clearTimeout(toastTimer);
    if (searchTimer) clearTimeout(searchTimer);
});

/* Rolagem da página trava enquanto o diálogo está aberto. */
useBodyScrollLock(() => novoAlunoModalOpen.value || importModalOpen.value);
</script>

<template>
    <div class="andes-dash andes-alu">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">{{ t('sidebar.students', 'Alunos') }}</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                {{ t('students.subtitle', 'Gerencie acessos, inscrições e importação de alunos nos seus produtos.') }}
            </p>
        </header>

        <div class="andes-summary">
            <span class="andes-summary__item">
                <b>{{ displayNumber(stats.total_alunos) }}</b> alunos
            </span>
            <span class="andes-summary__item">
                <b>{{ displayNumber(stats.total_inscricoes) }}</b> inscrições
            </span>
            <span class="andes-summary__item">
                <b>{{ displayNumber(stats.produtos_ativos) }}</b> produtos com alunos
            </span>
            <span class="andes-summary__item">
                <b>{{ displayNumber(stats.alunos_novos_30dias) }}</b> novos em 30 dias
            </span>
        </div>

        <div class="andes-search andes-alu__search">
            <span class="andes-search__icon"><AndesIcon name="search" /></span>
            <input
                v-model="search"
                type="text"
                name="alunos_search"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                class="andes-ui-input"
                :placeholder="t('students.search_placeholder', 'Buscar aluno por nome ou e-mail...')"
                @input="onSearchInput"
            />
            <button
                v-if="search"
                type="button"
                class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button andes-search__clear"
                style="width: 32px; height: 32px; min-height: 32px"
                :aria-label="t('sales.clear_search', 'Limpar busca')"
                @click="search = ''; applyQuery({ q: '' })"
            >
                <AndesIcon name="close" />
            </button>
        </div>

        <div class="andes-filterbar">
            <AndesFilterMenu
                :label="t('students.filter', 'Alunos')"
                icon="filters"
                :options="filterOptions"
                :model-value="filter"
                neutral-value="todos"
                @change="setFilter"
            />
            <AndesFilterMenu
                :label="t('sidebar.products', 'Produtos')"
                icon="archive"
                :count="product_ids_filter?.length ?? 0"
                width="280px"
            >
                <label v-for="p in produtos" :key="p.id" class="andes-ui-choice">
                    <input
                        type="checkbox"
                        class="andes-ui-checkbox"
                        :checked="product_ids_filter?.includes(p.id)"
                        @change="toggleProductFilter(p.id)"
                    />
                    <span class="andes-ui-typography tp-body-small">{{ p.name }}</span>
                </label>
                <p v-if="!produtos.length" class="andes-menu__label">{{ t('products.empty', 'Nenhum produto') }}</p>
            </AndesFilterMenu>
            <AndesFilterMenu
                label="Ordenar"
                icon="chart-line"
                :options="sortOptions"
                :model-value="sort"
                neutral-value="name"
                @change="setSort"
            />

            <div class="andes-filterbar__end">
                <a :href="exportUrl" class="andes-ui-button andes-ui-button--small andes-ui-button--mute">
                    <AndesIcon name="download" />
                    Exportar CSV
                </a>
                <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="openImportModal">
                    <AndesIcon name="import" />
                    {{ t('common.import', 'Importar') }}
                </button>
                <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" @click="openNovoAluno">
                    <AndesIcon name="plus" />
                    {{ t('students.new_student', 'Novo aluno') }}
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
            <button type="button" class="andes-ui-textlink andes-ui-textlink--small" @click="limparRecorte">
                Limpar recorte
            </button>
        </div>

        <!-- Lista de alunos -->
        <ul v-if="alunosList.length" class="andes-ui-list andes-dash__list">
            <li
                v-for="a in alunosList"
                :key="a.id"
                class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                role="button"
                tabindex="0"
                @click="openDetail(a)"
                @keydown.enter.prevent="openDetail(a)"
                @keydown.space.prevent="openDetail(a)"
            >
                <div class="andes-ui-list__item-content">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute andes-alu__avatar">
                        {{ iniciais(a.name) }}
                    </span>
                    <span class="andes-dash__list-main">
                        <span class="andes-ui-typography tp-body-medium w-emphasis">{{ a.name }}</span>
                        <span class="andes-ui-typography tp-body-small c-secondary">{{ a.email }}</span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ produtosLabel(a) }}
                            <template v-if="desdeLabel(a)"> · {{ desdeLabel(a) }}</template>
                        </span>
                    </span>
                </div>
                <span class="andes-dash__list-values">
                    <span class="andes-ui-badge andes-ui-badge--large andes-ui-badge--neutral-quiet">
                        <span class="andes-ui-badge__content">
                            {{ a.products_count ?? 0 }} {{ (a.products_count ?? 0) === 1 ? 'produto' : 'produtos' }}
                        </span>
                    </span>
                    <span class="andes-ui-list__item-chevron"><AndesIcon name="chevron-right" /></span>
                </span>
            </li>
        </ul>

        <div v-else class="andes-ui-card andes-ui-card--padding-large">
            <div class="andes-empty">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="documents" />
                </span>
                <b class="andes-ui-typography tp-heading-medium">
                    {{ appliedChips.length ? 'Nenhum aluno neste recorte.' : t('students.empty', 'Nenhum aluno com acesso ainda.') }}
                </b>
                <span class="andes-ui-typography tp-body-small c-secondary">
                    {{ appliedChips.length
                        ? 'Tente outro nome, produto ou volte para todos os alunos.'
                        : t('students.empty_hint', 'Cadastre ou importe alunos para liberar o acesso aos seus produtos.') }}
                </span>
                <div class="andes-actions" style="margin-top: 12px; justify-content: center">
                    <button
                        v-if="appliedChips.length"
                        type="button"
                        class="andes-ui-button andes-ui-button--medium andes-ui-button--mute"
                        @click="limparRecorte"
                    >
                        <AndesIcon name="refresh" />
                        Limpar recorte
                    </button>
                    <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" @click="openNovoAluno">
                        <AndesIcon name="plus" />
                        {{ t('students.new_student', 'Novo aluno') }}
                    </button>
                </div>
            </div>
        </div>

        <nav v-if="alunos?.links?.length > 3" class="andes-pagination" :aria-label="t('common.pagination', 'Paginação')">
            <a
                v-for="link in alunos.links"
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

        <AlunoDetailSidebar
            :open="sidebarOpen"
            :aluno="selectedAluno"
            :produtos="produtos"
            @close="closeSidebar"
            @updated="handleAlunoUpdated"
            @deleted="handleAlunoDeleted"
        />

        <!-- Novo aluno -->
        <Teleport to="body">
            <div v-show="novoAlunoModalOpen" class="andes-dash andes-modal" style="z-index: 100001" aria-modal="true" role="dialog">
                <div class="andes-modal__veil" @click="closeNovoAluno" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card">
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="user" />
                        </span>
                        <b class="andes-ui-typography tp-heading-large">{{ t('students.new_student', 'Cadastrar novo aluno') }}</b>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            :aria-label="t('common.close', 'Fechar')"
                            @click="closeNovoAluno"
                        >
                            <AndesIcon name="close" />
                        </button>
                    </div>

                    <div class="andes-form andes-form--wide">
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="aluno-nome">{{ t('common.name', 'Nome') }}</label>
                            <input
                                id="aluno-nome"
                                v-model="novoAlunoForm.name"
                                type="text"
                                name="novo_aluno_name"
                                autocomplete="off"
                                autocapitalize="words"
                                autocorrect="off"
                                spellcheck="false"
                                class="andes-ui-input"
                                :placeholder="t('students.name_placeholder', 'Nome do aluno')"
                            />
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="aluno-email">{{ t('common.email', 'E-mail') }}</label>
                            <input
                                id="aluno-email"
                                v-model="novoAlunoForm.email"
                                type="email"
                                name="novo_aluno_email"
                                autocomplete="off"
                                autocapitalize="off"
                                autocorrect="off"
                                spellcheck="false"
                                class="andes-ui-input"
                                placeholder="email@exemplo.com"
                            />
                        </div>
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="aluno-senha">{{ t('common.password', 'Senha') }}</label>
                            <input
                                id="aluno-senha"
                                v-model="novoAlunoForm.password"
                                type="password"
                                name="novo_aluno_password"
                                autocomplete="new-password"
                                class="andes-ui-input"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                        <label class="andes-ui-choice">
                            <input v-model="novoAlunoForm.send_access_email" type="checkbox" class="andes-ui-checkbox" />
                            <span class="andes-ui-typography tp-body-small">
                                {{ t('students.send_access_email_create', 'Enviar e-mail de acesso ao criar') }}
                            </span>
                        </label>
                        <div class="andes-ui-form-control">
                            <span class="andes-ui-form-control__label">
                                {{ t('students.products_access_optional', 'Produtos com acesso (opcional)') }}
                            </span>
                            <div class="andes-choicelist">
                                <label v-for="p in produtos" :key="p.id" class="andes-ui-choice">
                                    <input
                                        type="checkbox"
                                        class="andes-ui-checkbox"
                                        :checked="novoAlunoForm.product_ids.includes(p.id)"
                                        @change="toggleNovoProduct(p.id)"
                                    />
                                    <span class="andes-ui-typography tp-body-small">{{ p.name }}</span>
                                </label>
                                <p v-if="!produtos.length" class="andes-menu__label">
                                    {{ t('students.no_products_available', 'Nenhum produto disponível') }}
                                </p>
                            </div>
                        </div>
                        <div class="andes-actions">
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--medium andes-ui-button--mute"
                                :disabled="savingNovo"
                                @click="closeNovoAluno"
                            >
                                {{ t('common.cancel', 'Cancelar') }}
                            </button>
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                                :disabled="savingNovo"
                                @click="saveNovoAluno"
                            >
                                {{ t('students.register', 'Cadastrar') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Importar -->
        <Teleport to="body">
            <div v-show="importModalOpen" class="andes-dash andes-modal" style="z-index: 100001" aria-modal="true" role="dialog">
                <div class="andes-modal__veil" @click="closeImportModal" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card">
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="import" />
                        </span>
                        <b class="andes-ui-typography tp-heading-large">{{ t('students.import.title', 'Importar alunos em massa') }}</b>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            :aria-label="t('common.close', 'Fechar')"
                            @click="closeImportModal"
                        >
                            <AndesIcon name="close" />
                        </button>
                    </div>

                    <p class="andes-ui-typography tp-body-medium c-secondary" style="margin-bottom: 12px">
                        {{ t('students.import.hint', 'Envie um arquivo CSV com as colunas: nome, email, senha (opcional). Use ; ou , como separador.') }}
                    </p>
                    <a href="/produtos/alunos/import-example" download class="andes-ui-textlink" style="margin-bottom: 16px">
                        <AndesIcon name="download" />
                        {{ t('students.import.download_example', 'Baixar CSV de exemplo') }}
                    </a>

                    <div class="andes-form andes-form--wide" style="margin-top: 16px">
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="import-file">
                                {{ t('students.import.csv_file', 'Arquivo CSV') }}
                            </label>
                            <input id="import-file" type="file" accept=".csv,.txt" class="andes-ui-input andes-ui-input--file" @change="onImportFileChange" />
                            <p v-if="importForm.file" class="andes-ui-form-control__help">{{ importForm.file.name }}</p>
                        </div>
                        <label class="andes-ui-choice">
                            <input v-model="importForm.send_access_email" type="checkbox" class="andes-ui-checkbox" />
                            <span class="andes-ui-typography tp-body-small">
                                {{ t('students.import.send_access_email', 'Enviar e-mail de acesso aos importados') }}
                            </span>
                        </label>
                        <div class="andes-ui-form-control">
                            <span class="andes-ui-form-control__label">
                                {{ t('students.import.products_required', 'Produtos para dar acesso (obrigatório)') }}
                            </span>
                            <div class="andes-choicelist">
                                <label v-for="p in produtos" :key="p.id" class="andes-ui-choice">
                                    <input
                                        type="checkbox"
                                        class="andes-ui-checkbox"
                                        :checked="importForm.product_ids.includes(p.id)"
                                        @change="toggleImportProduct(p.id)"
                                    />
                                    <span class="andes-ui-typography tp-body-small">{{ p.name }}</span>
                                </label>
                                <p v-if="!produtos.length" class="andes-menu__label">
                                    {{ t('students.no_products_available', 'Nenhum produto disponível') }}
                                </p>
                            </div>
                        </div>
                        <div class="andes-actions">
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--medium andes-ui-button--mute"
                                :disabled="importing"
                                @click="closeImportModal"
                            >
                                {{ t('common.cancel', 'Cancelar') }}
                            </button>
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                                :disabled="importing"
                                @click="saveImport"
                            >
                                {{ t('common.import', 'Importar') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Aviso -->
        <Teleport to="body">
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
