<script setup>
import { ref, computed, watch } from 'vue';
import { router, usePage } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import ApiKeySidebar from '@/components/api-applications/ApiKeySidebar.vue';
import ApiWebhookSidebar from '@/components/api-applications/ApiWebhookSidebar.vue';
import ApiWebhookCard from '@/components/api-applications/ApiWebhookCard.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

defineOptions({ layout: LayoutInfoprodutor });

const props = defineProps({
    application: { type: Object, required: true },
    keys: { type: Array, default: () => [] },
    webhook: { type: Object, default: () => ({}) },
    webhook_event_catalog: { type: Object, default: () => ({}) },
    available_scopes: { type: Array, default: () => [] },
    scope_catalog: { type: Array, default: () => [] },
    recent_deliveries: { type: Array, default: () => [] },
    api_key_reveal: { type: Object, default: null },
    webhook_secret_reveal: { type: String, default: null },
    webhook_secret_mask: { type: String, default: '' },
});

const page = usePage();
const flashSuccess = computed(() => page.props.flash?.success ?? null);
const flashError = computed(() => page.props.flash?.error ?? null);

const tabs = [
    { id: 'chaves', label: 'Chaves', icon: 'key' },
    { id: 'webhooks', label: 'Webhooks', icon: 'link' },
];

function tabFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    return t === 'webhooks' ? 'webhooks' : 'chaves';
}

const activeTab = ref(tabFromUrl());

watch(() => page.url, () => {
    activeTab.value = tabFromUrl();
});

function setTab(id) {
    activeTab.value = id;
    router.visit(`/aplicacoes-api?tab=${id}`, { preserveState: true, preserveScroll: true, replace: true });
}

const keySidebarOpen = ref(false);
const editingKey = ref(null);
const webhookSidebarOpen = ref(false);

const showKeyModal = ref(!!props.api_key_reveal);
const revealedPublicKey = ref(props.api_key_reveal?.public_key ?? '');
const revealedSecretKey = ref(props.api_key_reveal?.secret_key ?? '');
const copyKeyFeedback = ref(false);

const showWebhookSecretModal = ref(!!props.webhook_secret_reveal);
const revealedWebhookSecret = ref(props.webhook_secret_reveal ?? '');

const revealedSecrets = ref({});
const revealLoading = ref({});
const revealErrors = ref({});
const copyDone = ref({});

watch(() => props.api_key_reveal, (val) => {
    if (val) {
        revealedPublicKey.value = val.public_key ?? '';
        revealedSecretKey.value = val.secret_key ?? '';
        showKeyModal.value = true;
        copyKeyFeedback.value = false;
    }
});

watch(() => props.webhook_secret_reveal, (val) => {
    if (val) {
        revealedWebhookSecret.value = val;
        showWebhookSecretModal.value = true;
    }
});

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

function openCreateKey() {
    editingKey.value = null;
    keySidebarOpen.value = true;
}

function openEditKey(key) {
    editingKey.value = key;
    keySidebarOpen.value = true;
}

function maskSecret() {
    return 'gsk_******************';
}

async function copyToClipboard(text) {
    if (!text) return false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

async function copyText(key, text) {
    const value = text ?? '';
    if (!value) return;
    const ok = await copyToClipboard(value);
    copyDone.value = { ...copyDone.value, [key]: ok };
    if (ok) {
        setTimeout(() => {
            copyDone.value = { ...copyDone.value, [key]: false };
        }, 2000);
    }
}

async function revealSecret(keyRow) {
    const rowKey = String(keyRow.id);
    revealErrors.value = { ...revealErrors.value, [rowKey]: '' };
    revealLoading.value = { ...revealLoading.value, [rowKey]: true };
    try {
        const url = keyRow.type === 'legacy'
            ? `/aplicacoes-api/${props.application.id}/reveal-secret`
            : `/aplicacoes-api/${props.application.id}/keys/${keyRow.id}/reveal-secret`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
            },
            credentials: 'same-origin',
            body: '{}',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            revealErrors.value = { ...revealErrors.value, [rowKey]: data.message || 'Não foi possível revelar.' };
            return;
        }
        revealedSecrets.value = { ...revealedSecrets.value, [rowKey]: data.secret_key ?? '' };
    } finally {
        revealLoading.value = { ...revealLoading.value, [rowKey]: false };
    }
}

function hideRevealed(rowKey) {
    const next = { ...revealedSecrets.value };
    delete next[rowKey];
    revealedSecrets.value = next;
}

function copyRevealedSecret(keyRow) {
    const rowKey = String(keyRow.id);
    copyText(`sec-${rowKey}`, revealedSecrets.value[rowKey]);
}

function regenerateKey(keyRow) {
    if (!confirm('Gerar novas credenciais? As atuais deixam de funcionar imediatamente.')) return;
    if (keyRow.type === 'legacy') {
        router.post(`/aplicacoes-api/${props.application.id}/regenerate-key`, {}, { preserveScroll: true });
        return;
    }
    router.post(`/aplicacoes-api/${props.application.id}/keys/${keyRow.id}/regenerate`, {}, { preserveScroll: true });
}

function toggleKeyActive(keyRow) {
    if (keyRow.type === 'legacy') {
        router.put(`/aplicacoes-api/${props.application.id}`, {
            is_active: !keyRow.is_active,
        }, { preserveScroll: true });
        return;
    }
    router.put(`/aplicacoes-api/${props.application.id}/keys/${keyRow.id}`, {
        name: keyRow.name,
        scopes: keyRow.scopes,
        is_active: !keyRow.is_active,
    }, { preserveScroll: true });
}

function deleteKey(keyRow) {
    if (!confirm('Remover esta chave? Integrações que a usam deixarão de funcionar.')) return;
    router.delete(`/aplicacoes-api/${props.application.id}/keys/${keyRow.id}`, { preserveScroll: true });
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

async function copyKeyModal(text) {
    if (!text) return;
    const ok = await copyToClipboard(text);
    copyKeyFeedback.value = ok;
    if (ok) {
        setTimeout(() => { copyKeyFeedback.value = false; }, 2000);
    }
}

function onWebhookSecretRotated(secret) {
    revealedWebhookSecret.value = secret;
    showWebhookSecretModal.value = true;
}

/* Rolagem da página trava enquanto o diálogo está aberto. */
useBodyScrollLock(() => showKeyModal.value || showWebhookSecretModal.value);
</script>

<template>
    <div class="andes-dash andes-api">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">API</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">Chaves de integração e webhooks outbound.</p>
        </header>

        <div v-if="flashSuccess" class="andes-ui-message andes-ui-message--positive andes-block--tight">
            <span class="andes-ui-message__text">{{ flashSuccess }}</span>
        </div>
        <div v-if="flashError" class="andes-ui-message andes-ui-message--negative andes-block--tight">
            <span class="andes-ui-message__text">{{ flashError }}</span>
        </div>

        <div class="andes-ui-tabs" style="margin-bottom: 24px">
            <div class="andes-ui-tabs__tablist" role="tablist" aria-label="API">
                <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    type="button"
                    role="tab"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': activeTab === tab.id }"
                    :aria-selected="activeTab === tab.id ? 'true' : 'false'"
                    @click="setTab(tab.id)"
                >
                    <AndesIcon :name="tab.icon" />
                    {{ tab.label }}
                </button>
            </div>
        </div>

        <!-- Chaves -->
        <div v-show="activeTab === 'chaves'">
            <div class="andes-toolbar">
                <span class="andes-ui-typography tp-body-small c-secondary andes-api__hint">
                    Crie várias chaves para ambientes diferentes. O secret completo só aparece na criação ou após revelar.
                </span>
                <div class="andes-toolbar__end">
                    <a
                        href="/docs/api-pagamentos"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute"
                    >
                        <AndesIcon name="document-text" />
                        Documentação
                    </a>
                    <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" @click="openCreateKey">
                        <AndesIcon name="plus" />
                        Criar chave
                    </button>
                </div>
            </div>

            <ul class="andes-ui-list andes-dash__list">
                <li
                    v-for="keyRow in keys"
                    :key="keyRow.id"
                    class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                >
                    <div class="andes-ui-list__item-content">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="key" />
                        </span>
                        <span class="andes-dash__list-main">
                            <span class="andes-ui-typography tp-body-medium w-emphasis">{{ keyRow.name }}</span>
                            <span class="andes-api__coderow">
                                <code class="andes-code">{{ keyRow.public_key_masked }}</code>
                                <button
                                    type="button"
                                    class="andes-ui-textlink andes-ui-textlink--small"
                                    :aria-label="`Copiar chave pública de ${keyRow.name}`"
                                    @click="copyText(`pub-${keyRow.id}`, keyRow.public_key)"
                                >
                                    <AndesIcon :name="copyDone[`pub-${keyRow.id}`] ? 'check' : 'copy'" />
                                    {{ copyDone[`pub-${keyRow.id}`] ? 'Copiado' : 'Copiar' }}
                                </button>
                            </span>
                            <span v-if="keyRow.is_active && keyRow.can_reveal_secret" class="andes-api__coderow">
                                <template v-if="revealedSecrets[keyRow.id]">
                                    <code class="andes-code andes-code--truncate">{{ revealedSecrets[keyRow.id] }}</code>
                                    <button type="button" class="andes-ui-textlink andes-ui-textlink--small" @click="copyRevealedSecret(keyRow)">
                                        <AndesIcon :name="copyDone[`sec-${keyRow.id}`] ? 'check' : 'copy'" />
                                        {{ copyDone[`sec-${keyRow.id}`] ? 'Copiado' : 'Copiar' }}
                                    </button>
                                    <button type="button" class="andes-ui-textlink andes-ui-textlink--small" @click="hideRevealed(keyRow.id)">
                                        <AndesIcon name="eye-closed" />
                                        Ocultar
                                    </button>
                                </template>
                                <template v-else>
                                    <code class="andes-code">{{ maskSecret() }}</code>
                                    <button
                                        type="button"
                                        class="andes-ui-textlink andes-ui-textlink--small"
                                        :disabled="revealLoading[keyRow.id]"
                                        @click="revealSecret(keyRow)"
                                    >
                                        <AndesIcon name="eye" />
                                        {{ revealLoading[keyRow.id] ? '…' : 'Revelar' }}
                                    </button>
                                </template>
                            </span>
                            <span v-if="revealErrors[keyRow.id]" class="andes-error">{{ revealErrors[keyRow.id] }}</span>
                            <span class="andes-ui-typography tp-body-small c-secondary">Criada em {{ formatDate(keyRow.created_at) }}</span>
                        </span>
                    </div>
                    <span class="andes-dash__list-values">
                        <span
                            class="andes-ui-badge andes-ui-badge--medium"
                            :class="keyRow.is_active ? 'andes-ui-badge--positive-quiet' : 'andes-ui-badge--neutral-quiet'"
                        >
                            <span class="andes-ui-badge__content">{{ keyRow.is_active ? 'Ativa' : 'Revogada' }}</span>
                        </span>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            aria-label="Editar chave"
                            @click="openEditKey(keyRow)"
                        >
                            <AndesIcon name="pencil" />
                        </button>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            aria-label="Rotacionar chave"
                            @click="regenerateKey(keyRow)"
                        >
                            <AndesIcon name="refresh" />
                        </button>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            :aria-label="keyRow.is_active ? 'Revogar chave' : 'Ativar chave'"
                            @click="toggleKeyActive(keyRow)"
                        >
                            <AndesIcon :name="keyRow.is_active ? 'eye-closed' : 'eye'" />
                        </button>
                        <button
                            v-if="keyRow.can_delete"
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            aria-label="Remover chave"
                            @click="deleteKey(keyRow)"
                        >
                            <AndesIcon name="trash" />
                        </button>
                    </span>
                </li>
                <li v-if="!keys.length" class="andes-ui-list__item andes-ui-list__item--size-large">
                    <span class="andes-ui-typography tp-body-medium c-secondary">Nenhuma chave criada ainda.</span>
                </li>
            </ul>
        </div>

        <!-- Webhooks -->
        <div v-show="activeTab === 'webhooks'">
            <div class="andes-toolbar">
                <span class="andes-ui-typography tp-body-small c-secondary andes-api__hint">
                    Receba POST HTTPS assinados (HMAC) quando pagamentos e saques mudarem de estado.
                </span>
                <div class="andes-toolbar__end">
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute"
                        @click="router.reload({ only: ['webhook', 'recent_deliveries'] })"
                    >
                        <AndesIcon name="refresh" />
                        Atualizar
                    </button>
                    <a
                        href="/docs/api-pagamentos"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute"
                    >
                        <AndesIcon name="document-text" />
                        Como integrar
                    </a>
                    <button
                        v-if="!webhook.configured"
                        type="button"
                        class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                        @click="webhookSidebarOpen = true"
                    >
                        <AndesIcon name="plus" />
                        Adicionar endpoint
                    </button>
                </div>
            </div>

            <ApiWebhookCard
                v-if="webhook.configured"
                :application-id="application.id"
                :webhook="webhook"
                :event-catalog="webhook_event_catalog"
                :recent-deliveries="recent_deliveries"
                @edit="webhookSidebarOpen = true"
                @rotated-secret="onWebhookSecretRotated"
            />

            <div v-else class="andes-ui-card andes-ui-card--padding-large">
                <div class="andes-empty">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                        <AndesIcon name="link" />
                    </span>
                    <b class="andes-ui-typography tp-heading-medium">Nenhum endpoint configurado.</b>
                    <span class="andes-ui-typography tp-body-small c-secondary">
                        Aponte uma URL HTTPS para receber os eventos da sua conta.
                    </span>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                        style="margin-top: 12px"
                        @click="webhookSidebarOpen = true"
                    >
                        <AndesIcon name="plus" />
                        Adicionar endpoint
                    </button>
                </div>
            </div>
        </div>

        <ApiKeySidebar
            :open="keySidebarOpen"
            :application-id="application.id"
            :available-scopes="available_scopes"
            :scope-catalog="scope_catalog"
            :editing-key="editingKey"
            @close="keySidebarOpen = false"
            @saved="keySidebarOpen = false"
        />

        <ApiWebhookSidebar
            :open="webhookSidebarOpen"
            :application-id="application.id"
            :webhook="webhook"
            :event-catalog="webhook_event_catalog"
            :webhook-secret-mask="webhook_secret_mask"
            @close="webhookSidebarOpen = false"
            @saved="webhookSidebarOpen = false"
        />

        <!-- Credenciais (cópia única) -->
        <Teleport to="body">
            <div v-show="showKeyModal && revealedSecretKey" class="andes-dash andes-modal" style="z-index: 100001" aria-modal="true" role="dialog">
                <div class="andes-modal__veil" @click="showKeyModal = false" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card andes-modal__card--wide">
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="key" />
                        </span>
                        <b class="andes-ui-typography tp-heading-large">Suas chaves de API</b>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                            style="width: 32px; height: 32px; min-height: 32px"
                            aria-label="Fechar"
                            @click="showKeyModal = false"
                        >
                            <AndesIcon name="close" />
                        </button>
                    </div>
                    <p class="andes-ui-typography tp-body-medium c-secondary" style="margin-bottom: 16px">
                        Copie e guarde em local seguro. Depois use <b class="w-emphasis">Revelar</b> na lista.
                    </p>
                    <div class="andes-api__secretbox">
                        <span class="andes-ui-typography tp-body-small c-secondary">Public key</span>
                        <div class="andes-api__coderow">
                            <code class="andes-code andes-code--truncate">{{ revealedPublicKey }}</code>
                            <button type="button" class="andes-ui-button andes-ui-button--small andes-ui-button--quiet" @click="copyKeyModal(revealedPublicKey)">
                                <AndesIcon name="copy" />
                                Copiar
                            </button>
                        </div>
                    </div>
                    <div class="andes-api__secretbox andes-api__secretbox--caution">
                        <span class="andes-ui-typography tp-body-small">Secret key</span>
                        <div class="andes-api__coderow">
                            <code class="andes-code andes-code--truncate">{{ revealedSecretKey }}</code>
                            <button type="button" class="andes-ui-button andes-ui-button--small andes-ui-button--quiet" @click="copyKeyModal(revealedSecretKey)">
                                <AndesIcon :name="copyKeyFeedback ? 'check' : 'copy'" />
                                {{ copyKeyFeedback ? 'Copiado!' : 'Copiar' }}
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--medium andes-ui-button--loud andes-ui-button--full-width"
                        style="margin-top: 16px"
                        @click="showKeyModal = false"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </Teleport>

        <!-- Signing secret do webhook -->
        <Teleport to="body">
            <div
                v-show="showWebhookSecretModal && revealedWebhookSecret"
                class="andes-dash andes-modal"
                style="z-index: 100001"
                aria-modal="true"
                role="dialog"
            >
                <div class="andes-modal__veil" @click="showWebhookSecretModal = false" />
                <div class="andes-ui-card andes-ui-card--padding-huge andes-modal__card andes-modal__card--wide">
                    <div class="andes-modal__head">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                            <AndesIcon name="lock" />
                        </span>
                        <b class="andes-ui-typography tp-heading-large">Signing secret do webhook</b>
                    </div>
                    <p class="andes-ui-typography tp-body-medium c-secondary" style="margin-bottom: 16px">
                        Copie agora. Não será exibido novamente.
                    </p>
                    <div class="andes-api__secretbox andes-api__secretbox--caution">
                        <code class="andes-code andes-code--wrap">{{ revealedWebhookSecret }}</code>
                    </div>
                    <div class="andes-actions" style="margin-top: 16px">
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="copyKeyModal(revealedWebhookSecret)">
                            <AndesIcon name="copy" />
                            Copiar
                        </button>
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" @click="showWebhookSecretModal = false">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
