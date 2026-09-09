<script setup>
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import { useI18n } from '@/composables/useI18n';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

const props = defineProps({
    open: { type: Boolean, default: false },
    webhooks: { type: Array, default: () => [] },
    webhookEvents: { type: Object, default: () => ({}) },
    products: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'saved']);

useBodyScrollLock(() => props.open);
const { t } = useI18n();

const editingWebhook = ref(null);
const isCreating = ref(false);

const showingForm = computed(
    () => editingWebhook.value !== null || isCreating.value
);

const form = ref({
    name: '',
    url: '',
    bearer_token: '',
    events: [],
    is_active: true,
    product_ids: [],
});
const saving = ref(false);
const deleting = ref(null);
const confirmingDeleteId = ref(null);
const testing = ref(null);
const testMessage = ref(null);
const testSuccess = ref(null);
const errorMessage = ref(null);

const showTestModal = ref(false);
const testTargetWebhook = ref(null);
const selectedTestEvent = ref('');

const logsByWebhookId = ref({});
const loadingLogs = ref(null);
const expandedLogsWebhookId = ref(null);

const logDetailModal = ref(false);
const selectedLogDetail = ref(null);
const loadingLogDetail = ref(false);

const eventEntries = ref([]);

watch(
    () => props.webhookEvents,
    (events) => {
        eventEntries.value = Object.entries(events || {});
    },
    { immediate: true }
);

watch(
    () => [props.open, props.webhooks],
    () => {
        if (!props.open) {
            resetForm();
        }
    }
);

function resetForm() {
    editingWebhook.value = null;
    isCreating.value = false;
    confirmingDeleteId.value = null;
    form.value = {
        name: '',
        url: '',
        bearer_token: '',
        events: [],
        is_active: true,
        product_ids: [],
    };
    errorMessage.value = null;
    testMessage.value = null;
}

function startNew() {
    editingWebhook.value = null;
    isCreating.value = true;
    form.value = {
        name: '',
        url: '',
        bearer_token: '',
        events: [],
        is_active: true,
        product_ids: [],
    };
    errorMessage.value = null;
}

function editWebhook(w) {
    isCreating.value = false;
    editingWebhook.value = w;
    form.value = {
        name: w.name,
        url: w.url,
        bearer_token: '',
        events: [...(w.events || [])],
        is_active: w.is_active ?? true,
        product_ids: (w.products || []).map(p => p.id),
    };
    errorMessage.value = null;
}

function cancelEdit() {
    resetForm();
}

function toggleEvent(eventClass) {
    const idx = form.value.events.indexOf(eventClass);
    if (idx >= 0) {
        form.value.events.splice(idx, 1);
    } else {
        form.value.events.push(eventClass);
    }
}

function isEventSelected(eventClass) {
    return form.value.events.includes(eventClass);
}

function toggleProduct(productId) {
    const idx = form.value.product_ids.indexOf(productId);
    if (idx >= 0) {
        form.value.product_ids.splice(idx, 1);
    } else {
        form.value.product_ids.push(productId);
    }
}

function isProductSelected(productId) {
    return form.value.product_ids.includes(productId);
}

async function save() {
    errorMessage.value = null;
    if (!form.value.name?.trim()) {
        errorMessage.value = t('integrations.webhook.error_name', 'Informe o nome do webhook.');
        return;
    }
    if (!form.value.url?.trim()) {
        errorMessage.value = t('integrations.webhook.error_url', 'Informe a URL do webhook.');
        return;
    }
    if (form.value.events.length === 0) {
        errorMessage.value = t('integrations.webhook.error_event', 'Selecione pelo menos um evento.');
        return;
    }

    saving.value = true;
    try {
        const payload = {
            name: form.value.name.trim(),
            url: form.value.url.trim(),
            events: form.value.events,
            is_active: form.value.is_active,
            product_ids: form.value.product_ids,
        };
        if (form.value.bearer_token?.trim()) {
            payload.bearer_token = form.value.bearer_token.trim();
        }

        if (editingWebhook.value) {
            await axios.put(
                `/integracoes/webhooks/${editingWebhook.value.id}`,
                payload
            );
        } else {
            await axios.post('/integracoes/webhooks', payload);
        }
        emit('saved');
        resetForm(); // volta para a lista
    } catch (err) {
        errorMessage.value =
            err.response?.data?.message || t('integrations.error_save', 'Erro ao salvar webhook.');
    } finally {
        saving.value = false;
    }
}

function openTestModal(w) {
    testTargetWebhook.value = w;
    selectedTestEvent.value = eventEntries.value.length ? eventEntries.value[0][0] : '';
    testMessage.value = null;
    showTestModal.value = true;
}

function closeTestModal() {
    showTestModal.value = false;
    testTargetWebhook.value = null;
}

async function confirmTestSend() {
    if (!testTargetWebhook.value) return;
    const w = testTargetWebhook.value;
    testing.value = w.id;
    testMessage.value = null;
    closeTestModal();
    try {
        const { data } = await axios.post(`/integracoes/webhooks/${w.id}/test`, {
            event: selectedTestEvent.value || undefined,
        });
        testSuccess.value = data.success;
        testMessage.value = data.message || (data.success ? t('integrations.webhook.test_success', 'Evento enviado com sucesso!') : t('integrations.webhook.test_fail', 'Falha ao enviar.'));
        if (logsByWebhookId.value[w.id]) {
            await fetchLogs(w.id);
        }
    } catch (err) {
        testSuccess.value = false;
        testMessage.value =
            err.response?.data?.message || t('integrations.webhook.test_error', 'Erro ao disparar evento de teste.');
    } finally {
        testing.value = null;
    }
}

async function fetchLogs(webhookId) {
    loadingLogs.value = webhookId;
    try {
        const { data } = await axios.get(`/integracoes/webhooks/${webhookId}/logs`);
        logsByWebhookId.value[webhookId] = data.logs || [];
    } catch {
        logsByWebhookId.value[webhookId] = [];
    } finally {
        loadingLogs.value = null;
    }
}

function toggleLogs(w) {
    if (expandedLogsWebhookId.value === w.id) {
        expandedLogsWebhookId.value = null;
        return;
    }
    expandedLogsWebhookId.value = w.id;
    if (!logsByWebhookId.value[w.id]) {
        fetchLogs(w.id);
    }
}

function formatLogDate(iso) {
    if (!iso) return '–';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

async function openLogDetail(webhookId, logId) {
    loadingLogDetail.value = true;
    selectedLogDetail.value = null;
    logDetailModal.value = true;
    try {
        const { data } = await axios.get(
            `/integracoes/webhooks/${webhookId}/logs/${logId}`
        );
        selectedLogDetail.value = data.log;
    } catch {
        selectedLogDetail.value = null;
    } finally {
        loadingLogDetail.value = false;
    }
}

function closeLogDetail() {
    logDetailModal.value = false;
    selectedLogDetail.value = null;
}

function formatPayload(obj) {
    if (obj == null) return '–';
    try {
        if (typeof obj === 'string') {
            const trimmed = obj.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                return JSON.stringify(JSON.parse(obj), null, 2);
            }
            return obj;
        }
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

function copyToClipboard(text, label) {
    if (text == null) return;
    const s = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    navigator.clipboard.writeText(s).then(() => {
        // poderia usar um toast; por simplicidade não adicionamos
    });
}

function requestDelete(w) {
    confirmingDeleteId.value = w.id;
}

function cancelDelete() {
    confirmingDeleteId.value = null;
}

async function confirmRemoveWebhook(w) {
    deleting.value = w.id;
    confirmingDeleteId.value = null;
    try {
        await axios.delete(`/integracoes/webhooks/${w.id}`);
        emit('saved');
        if (editingWebhook.value?.id === w.id) {
            resetForm();
        }
    } catch (err) {
        errorMessage.value =
            err.response?.data?.message || t('integrations.error_delete', 'Erro ao excluir integração.');
    } finally {
        deleting.value = null;
    }
}

/* Eventos são muitos: selecionar em massa evita 30 cliques. */
function selecionarTodosEventos() {
    form.value.events = eventEntries.value.map(([eventClass]) => eventClass);
}

function limparEventos() {
    form.value.events = [];
}

const totalEventos = computed(() => eventEntries.value.length);

/* Só o host, para a lista não ficar com a URL inteira. */
function hostDaUrl(url) {
    try {
        return new URL(url).host;
    } catch {
        return url ?? '';
    }
}

function resumoDoWebhook(w) {
    const partes = [
        `${(w.events || []).length} ${(w.events || []).length === 1 ? 'evento' : 'eventos'}`,
        (w.products || []).length
            ? `${w.products.length} ${w.products.length === 1 ? 'produto' : 'produtos'}`
            : 'todos os produtos',
    ];
    if (w.has_bearer_token) partes.push('com token');
    return partes.join(' · ');
}

const logsDoWebhookEmEdicao = computed(() => {
    const id = editingWebhook.value?.id;
    if (!id) return [];
    return logsByWebhookId.value[id] || [];
});

function close() {
    emit('close');
}

function truncateUrl(url, max = 40) {
    if (!url) return '';
    if (url.length <= max) return url;
    return url.slice(0, max) + '…';
}
</script>

<template>
    <Teleport to="body">
        <div v-show="open" class="andes-dash andes-modal" style="z-index: 100000" aria-modal="true" role="dialog">
            <div class="andes-modal__veil" aria-hidden="true" @click="close" />

            <div class="andes-ui-card andes-ui-card--padding-none andes-dialog__card">
                <header class="andes-drawer__head">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                        <AndesIcon name="link" />
                    </span>
                    <span class="andes-dash__list-main">
                        <b class="andes-ui-typography tp-heading-large">{{ t('integrations.webhook.title', 'Webhooks') }}</b>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            Receba os eventos da plataforma na sua URL, assinados com Bearer token.
                        </span>
                    </span>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                        style="width: 32px; height: 32px; min-height: 32px; margin-left: auto"
                        :aria-label="t('common.close', 'Fechar')"
                        @click="close"
                    >
                        <AndesIcon name="close" />
                    </button>
                </header>

                <!-- Lista -->
                <template v-if="!showingForm">
                    <div class="andes-drawer__body">
                        <ul v-if="webhooks.length" class="andes-ui-list">
                            <li
                                v-for="w in webhooks"
                                :key="w.id"
                                class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                                role="button"
                                tabindex="0"
                                @click="editWebhook(w)"
                                @keydown.enter.prevent="editWebhook(w)"
                            >
                                <div class="andes-ui-list__item-content">
                                    <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                                        <AndesIcon name="link" />
                                    </span>
                                    <span class="andes-dash__list-main">
                                        <span class="andes-ui-typography tp-body-medium w-emphasis">{{ w.name }}</span>
                                        <span class="andes-ui-typography tp-body-small c-secondary andes-int__linha">{{ hostDaUrl(w.url) }}</span>
                                        <span class="andes-ui-typography tp-body-small c-secondary">{{ resumoDoWebhook(w) }}</span>
                                    </span>
                                </div>
                                <span class="andes-dash__list-values">
                                    <span
                                        class="andes-ui-badge andes-ui-badge--medium"
                                        :class="w.is_active ? 'andes-ui-badge--positive-quiet' : 'andes-ui-badge--neutral-quiet'"
                                    >
                                        <span class="andes-ui-badge__content">
                                            {{ w.is_active ? t('common.active', 'Ativo') : t('common.inactive', 'Inativo') }}
                                        </span>
                                    </span>
                                    <span class="andes-ui-list__item-chevron"><AndesIcon name="chevron-right" /></span>
                                </span>
                            </li>
                        </ul>

                        <div v-else class="andes-empty">
                            <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                                <AndesIcon name="link" />
                            </span>
                            <b class="andes-ui-typography tp-heading-medium">Nenhum webhook configurado.</b>
                            <span class="andes-ui-typography tp-body-small c-secondary">
                                Aponte uma URL HTTPS e escolha quais eventos quer receber.
                            </span>
                        </div>

                        <div v-if="testMessage" class="andes-ui-message" :class="testSuccess ? 'andes-ui-message--positive' : 'andes-ui-message--negative'" style="margin-top: 16px">
                            <span class="andes-ui-message__text">{{ testMessage }}</span>
                        </div>
                    </div>

                    <footer class="andes-drawer__foot">
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" @click="startNew">
                            <AndesIcon name="plus" />
                            {{ t('integrations.webhook.new', 'Novo webhook') }}
                        </button>
                    </footer>
                </template>

                <!-- Formulário -->
                <template v-else>
                    <div class="andes-drawer__body">
                        <div class="andes-chips">
                            <button type="button" class="andes-chip andes-chip--action" @click="cancelEdit">
                                <AndesIcon name="chevron-right" style="transform: rotate(180deg)" />
                                {{ t('integrations.webhook.title', 'Webhooks') }}
                            </button>
                        </div>

                        <b class="andes-ui-typography tp-heading-medium" style="display: block; margin-bottom: 16px">
                            {{ editingWebhook ? t('integrations.webhook.edit', 'Editar webhook') : t('integrations.webhook.new', 'Novo webhook') }}
                        </b>

                        <!-- O que já está valendo, antes de qualquer campo -->
                        <div v-if="editingWebhook" class="andes-ui-card andes-ui-card--highlight andes-ui-card--padding-large andes-block--tight">
                            <div class="andes-dash__sectionbar" style="margin-bottom: 8px">
                                <b class="andes-ui-typography tp-heading-medium">{{ editingWebhook.name }}</b>
                                <span
                                    class="andes-ui-badge andes-ui-badge--medium"
                                    :class="editingWebhook.is_active ? 'andes-ui-badge--positive-quiet' : 'andes-ui-badge--neutral-quiet'"
                                >
                                    <span class="andes-ui-badge__content">
                                        {{ editingWebhook.is_active ? t('common.active', 'Ativo') : t('common.inactive', 'Inativo') }}
                                    </span>
                                </span>
                            </div>
                            <dl class="andes-dl">
                                <div class="andes-dl__full">
                                    <dt>Endpoint</dt>
                                    <dd><code class="andes-code">{{ editingWebhook.url }}</code></dd>
                                </div>
                                <div>
                                    <dt>Eventos</dt>
                                    <dd>{{ (editingWebhook.events || []).length }}</dd>
                                </div>
                                <div>
                                    <dt>Produtos</dt>
                                    <dd>{{ (editingWebhook.products || []).length || 'Todos' }}</dd>
                                </div>
                                <div>
                                    <dt>Autenticação</dt>
                                    <dd>{{ editingWebhook.has_bearer_token ? 'Bearer token' : 'Sem token' }}</dd>
                                </div>
                            </dl>
                        </div>

                        <div v-else class="andes-ui-message andes-ui-message--informative andes-block--tight">
                            <span class="andes-ui-message__text">
                                <b class="andes-ui-message__title" style="display: block">Como funciona</b>
                                A cada evento escolhido, enviamos um POST em JSON para a sua URL. Se você informar um
                                Bearer token, ele vai no cabeçalho <b class="w-emphasis">Authorization</b> de toda chamada.
                            </span>
                        </div>

                        <!-- Ações do webhook existente, como atalhos -->
                        <div v-if="editingWebhook" class="andes-ui-shortcuts andes-block--tight">
                            <button type="button" class="andes-ui-shortcut" :disabled="testing === editingWebhook.id" @click="openTestModal(editingWebhook)">
                                <span class="andes-ui-shortcut__icon"><AndesIcon name="export" /></span>
                                <span class="andes-ui-shortcut__label">{{ testing === editingWebhook.id ? 'Enviando' : 'Testar envio' }}</span>
                            </button>
                            <button type="button" class="andes-ui-shortcut" @click="toggleLogs(editingWebhook)">
                                <span class="andes-ui-shortcut__icon"><AndesIcon name="document-text" /></span>
                                <span class="andes-ui-shortcut__label">Últimos envios</span>
                            </button>
                            <button type="button" class="andes-ui-shortcut" @click="requestDelete(editingWebhook)">
                                <span class="andes-ui-shortcut__icon"><AndesIcon name="trash" /></span>
                                <span class="andes-ui-shortcut__label">Excluir</span>
                            </button>
                        </div>

                        <div v-if="confirmingDeleteId === editingWebhook?.id" class="andes-ui-message andes-ui-message--negative andes-block--tight">
                            <span class="andes-ui-message__text">
                                <b class="andes-ui-message__title" style="display: block">Excluir "{{ editingWebhook.name }}"?</b>
                                A URL para de receber eventos na hora.
                            </span>
                        </div>
                        <div v-if="confirmingDeleteId === editingWebhook?.id" class="andes-actions andes-block--tight">
                            <button type="button" class="andes-ui-button andes-ui-button--small andes-ui-button--mute" @click="cancelDelete">
                                {{ t('common.cancel', 'Cancelar') }}
                            </button>
                            <button
                                type="button"
                                class="andes-ui-button andes-ui-button--small andes-ui-button--loud andes-ui-button--danger"
                                :disabled="deleting === editingWebhook.id"
                                @click="confirmRemoveWebhook(editingWebhook)"
                            >
                                {{ deleting === editingWebhook.id ? t('common.deleting', 'Excluindo...') : t('common.delete', 'Excluir') }}
                            </button>
                        </div>

                        <div v-if="testMessage" class="andes-ui-message andes-block--tight" :class="testSuccess ? 'andes-ui-message--positive' : 'andes-ui-message--negative'">
                            <span class="andes-ui-message__text">{{ testMessage }}</span>
                        </div>

                        <div v-if="errorMessage" class="andes-ui-message andes-ui-message--negative andes-block--tight">
                            <span class="andes-ui-message__text">{{ errorMessage }}</span>
                        </div>

                        <form id="webhook-form" class="andes-form andes-form--wide" @submit.prevent="save">
                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="wh-nome">{{ t('common.name', 'Nome') }}</label>
                                <input id="wh-nome" v-model="form.name" type="text" class="andes-ui-input" placeholder="Ex: Minha integração" />
                            </div>

                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="wh-url">URL</label>
                                <input id="wh-url" v-model="form.url" type="url" class="andes-ui-input" placeholder="https://seu-endpoint.com/webhook" />
                            </div>

                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="wh-token">
                                    {{ t('integrations.webhook.bearer_token', 'Bearer token') }} ({{ t('common.optional', 'opcional') }})
                                </label>
                                <input
                                    id="wh-token"
                                    v-model="form.bearer_token"
                                    type="password"
                                    autocomplete="new-password"
                                    class="andes-ui-input"
                                    :placeholder="editingWebhook ? t('common.leave_blank_keep', 'Deixe em branco para manter') : t('integrations.webhook.auth_token', 'Token de autenticação')"
                                />
                                <p class="andes-ui-form-control__help">
                                    {{ editingWebhook?.has_bearer_token && !form.bearer_token
                                        ? t('integrations.webhook.token_already_saved', 'Token já está salvo. Deixe em branco para manter.')
                                        : t('integrations.webhook.token_security_hint', 'Por segurança, o token salvo nunca é exibido aqui.') }}
                                </p>
                            </div>

                            <div class="andes-ui-form-control">
                                <div class="andes-dash__sectionbar" style="margin-bottom: 8px">
                                    <span class="andes-ui-form-control__label">
                                        {{ t('integrations.webhook.events', 'Eventos') }} · {{ form.events.length }} de {{ totalEventos }}
                                    </span>
                                    <button type="button" class="andes-ui-textlink andes-ui-textlink--small" @click="form.events.length === totalEventos ? limparEventos() : selecionarTodosEventos()">
                                        {{ form.events.length === totalEventos ? 'Limpar' : 'Selecionar todos' }}
                                    </button>
                                </div>
                                <div class="andes-choicelist">
                                    <label v-for="[eventClass, label] in eventEntries" :key="eventClass" class="andes-ui-choice">
                                        <input
                                            type="checkbox"
                                            class="andes-ui-checkbox"
                                            :checked="isEventSelected(eventClass)"
                                            @change="toggleEvent(eventClass)"
                                        />
                                        <span class="andes-ui-typography tp-body-small">{{ label }}</span>
                                    </label>
                                </div>
                            </div>

                            <div class="andes-ui-form-control">
                                <span class="andes-ui-form-control__label">{{ t('sidebar.products', 'Produtos') }}</span>
                                <div class="andes-choicelist">
                                    <label v-for="product in products" :key="product.id" class="andes-ui-choice">
                                        <input
                                            type="checkbox"
                                            class="andes-ui-checkbox"
                                            :checked="isProductSelected(product.id)"
                                            @change="toggleProduct(product.id)"
                                        />
                                        <span class="andes-ui-typography tp-body-small">{{ product.name }}</span>
                                    </label>
                                    <p v-if="!products.length" class="andes-menu__label">
                                        {{ t('products.empty', 'Nenhum produto cadastrado') }}
                                    </p>
                                </div>
                                <p class="andes-ui-form-control__help">
                                    Sem seleção, o webhook recebe os eventos de todos os produtos.
                                </p>
                            </div>

                            <label class="andes-ui-choice">
                                <input v-model="form.is_active" type="checkbox" class="andes-ui-checkbox" />
                                <span class="andes-dash__list-main">
                                    <span class="andes-ui-typography tp-body-medium">{{ t('common.active', 'Ativo') }}</span>
                                    <span class="andes-ui-typography tp-body-small c-secondary">
                                        Desativado, a URL para de receber eventos sem perder a configuração.
                                    </span>
                                </span>
                            </label>
                        </form>

                        <!-- Últimos envios -->
                        <template v-if="editingWebhook && expandedLogsWebhookId === editingWebhook.id">
                            <div class="andes-dash__sectionbar" style="margin-top: 24px">
                                <b class="andes-ui-typography tp-heading-medium">
                                    {{ t('integrations.webhook.last_deliveries', 'Últimos envios') }}
                                </b>
                            </div>

                            <p v-if="loadingLogs === editingWebhook.id" class="andes-ui-typography tp-body-small c-secondary">
                                {{ t('common.loading', 'Carregando...') }}
                            </p>

                            <ul v-else-if="logsDoWebhookEmEdicao.length" class="andes-ui-list">
                                <li
                                    v-for="log in logsDoWebhookEmEdicao"
                                    :key="log.id"
                                    class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                                    role="button"
                                    tabindex="0"
                                    @click="openLogDetail(editingWebhook.id, log.id)"
                                    @keydown.enter.prevent="openLogDetail(editingWebhook.id, log.id)"
                                >
                                    <div class="andes-ui-list__item-content">
                                        <span class="andes-dash__list-main">
                                            <span class="andes-ui-typography tp-body-small w-emphasis">{{ log.event ?? '—' }}</span>
                                            <span class="andes-ui-typography tp-body-small c-secondary">{{ formatLogDate(log.created_at) }}</span>
                                        </span>
                                    </div>
                                    <span class="andes-dash__list-values">
                                        <span
                                            class="andes-ui-badge andes-ui-badge--medium"
                                            :class="log.success ? 'andes-ui-badge--positive-quiet' : 'andes-ui-badge--negative-quiet'"
                                        >
                                            <span class="andes-ui-badge__content">{{ log.status_code ?? (log.success ? 'OK' : 'Falhou') }}</span>
                                        </span>
                                        <span class="andes-ui-list__item-chevron"><AndesIcon name="chevron-right" /></span>
                                    </span>
                                </li>
                            </ul>

                            <p v-else class="andes-ui-typography tp-body-small c-secondary">
                                Nenhum envio registrado ainda.
                            </p>
                        </template>
                    </div>

                    <footer class="andes-drawer__foot">
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" :disabled="saving" @click="cancelEdit">
                            {{ t('common.cancel', 'Cancelar') }}
                        </button>
                        <button type="submit" form="webhook-form" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" :disabled="saving">
                            {{ saving ? t('common.saving', 'Salvando...') : t('common.save', 'Salvar') }}
                        </button>
                    </footer>
                </template>
            </div>

            <!-- Escolher o evento de teste -->
            <div v-if="showTestModal && testTargetWebhook" class="andes-modal" style="z-index: 100003" role="dialog" aria-modal="true">
                <div class="andes-modal__veil" @click="closeTestModal" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card" style="max-width: 420px">
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="export" />
                        </span>
                        <b class="andes-ui-typography tp-heading-large">Enviar evento de teste</b>
                    </div>
                    <p class="andes-ui-typography tp-body-medium c-secondary" style="margin-bottom: 16px">
                        Um evento de exemplo será enviado para <b class="w-emphasis">{{ hostDaUrl(testTargetWebhook.url) }}</b>.
                    </p>
                    <div class="andes-form andes-form--wide">
                        <div class="andes-ui-form-control">
                            <label class="andes-ui-form-control__label" for="wh-teste-evento">Evento</label>
                            <select id="wh-teste-evento" v-model="selectedTestEvent" class="andes-ui-input">
                                <option v-for="[eventClass, label] in eventEntries" :key="eventClass" :value="eventClass">
                                    {{ label }}
                                </option>
                            </select>
                        </div>
                        <div class="andes-actions">
                            <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="closeTestModal">
                                {{ t('common.cancel', 'Cancelar') }}
                            </button>
                            <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" @click="confirmTestSend">
                                Enviar teste
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detalhe do envio -->
            <div v-if="logDetailModal" class="andes-modal" style="z-index: 100003" role="dialog" aria-modal="true">
                <div class="andes-modal__veil" @click="closeLogDetail" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card andes-modal__card--wide">
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="document-text" />
                        </span>
                        <b class="andes-ui-typography tp-heading-large">Detalhe do envio</b>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            :aria-label="t('common.close', 'Fechar')"
                            @click="closeLogDetail"
                        >
                            <AndesIcon name="close" />
                        </button>
                    </div>

                    <p v-if="loadingLogDetail" class="andes-ui-typography tp-body-medium c-secondary">
                        {{ t('common.loading', 'Carregando...') }}
                    </p>

                    <template v-else-if="selectedLogDetail">
                        <dl class="andes-dl andes-block--tight">
                            <div>
                                <dt>Evento</dt>
                                <dd>{{ selectedLogDetail.event ?? '—' }}</dd>
                            </div>
                            <div>
                                <dt>Resposta</dt>
                                <dd>{{ selectedLogDetail.status_code ?? '—' }}</dd>
                            </div>
                            <div class="andes-dl__full">
                                <dt>Quando</dt>
                                <dd>{{ formatLogDate(selectedLogDetail.created_at) }}</dd>
                            </div>
                        </dl>

                        <div class="andes-dash__sectionbar">
                            <b class="andes-ui-typography tp-heading-medium">Payload enviado</b>
                            <button
                                type="button"
                                class="andes-ui-textlink andes-ui-textlink--small"
                                @click="copyToClipboard(selectedLogDetail.payload, 'payload')"
                            >
                                <AndesIcon name="copy" />
                                Copiar
                            </button>
                        </div>
                        <code class="andes-code andes-code--wrap andes-block--tight">{{ formatPayload(selectedLogDetail.payload) }}</code>

                        <div class="andes-dash__sectionbar">
                            <b class="andes-ui-typography tp-heading-medium">Resposta recebida</b>
                            <button
                                type="button"
                                class="andes-ui-textlink andes-ui-textlink--small"
                                @click="copyToClipboard(selectedLogDetail.response_body, 'resposta')"
                            >
                                <AndesIcon name="copy" />
                                Copiar
                            </button>
                        </div>
                        <code class="andes-code andes-code--wrap">{{ formatPayload(selectedLogDetail.response_body) }}</code>
                    </template>

                    <p v-else class="andes-ui-typography tp-body-medium c-secondary">
                        Não foi possível carregar este envio.
                    </p>
                </div>
            </div>
        </div>
    </Teleport>
</template>
