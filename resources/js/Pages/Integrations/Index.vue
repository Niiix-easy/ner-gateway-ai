<script setup>
/**
 * Integrações no design system Andes.
 *
 * A tela era um catálogo de quatro cartões iguais com um selo "Ativo" — não
 * dava para saber o que estava conectado, quantos endpoints existiam nem quais
 * produtos cada integração cobria, mesmo com o servidor mandando tudo isso.
 *
 * Agora ela responde na ordem certa: o que já está ligado (com o resumo real da
 * conexão) e, depois, o catálogo do que dá para ligar.
 */
import { computed, ref } from 'vue';
import { router } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import SpedySidebar from '@/components/integrations/SpedySidebar.vue';
import UtmifySidebar from '@/components/integrations/UtmifySidebar.vue';
import WebhookSidebar from '@/components/integrations/WebhookSidebar.vue';
import CademiSidebar from '@/components/integrations/CademiSidebar.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import { useI18n } from '@/composables/useI18n';

defineOptions({ layout: LayoutInfoprodutor });
const { t } = useI18n();

const APPS_BASE = [
    {
        id: 'webhook',
        name: 'Webhook',
        description: t('integrations.webhook.description', 'Envie eventos da plataforma para sua URL. Configure quais eventos deseja receber e use Bearer token para autenticação.'),
        image: 'images/integrations/webhook.png',
    },
    {
        id: 'utmify',
        name: 'UTMIFY',
        description: t('integrations.utmify.description', 'Rastreie vendas e envie eventos para a UTMIFY. Requer apenas a chave de API.'),
        image: 'images/integrations/utmify.jpg',
    },
    {
        id: 'spedy',
        name: 'Spedy',
        description: t('integrations.spedy.description', 'Emissão automática de notas fiscais. Envie vendas para a Spedy e emita NF-e/NFS-e.'),
        image: 'images/integrations/spedy.png',
    },
    {
        id: 'cademi',
        name: 'Cademí',
        description: t('integrations.cademi.description', 'Área de membros externa. Após a compra, sincronize o aluno e conceda acesso na Cademí.'),
        image: 'images/integrations/cademi.png',
    },
];

const props = defineProps({
    webhooks: { type: Array, default: () => [] },
    webhook_events: { type: Object, default: () => ({}) },
    utmify_integrations: { type: Array, default: () => [] },
    spedy_integrations: { type: Array, default: () => [] },
    cademi_integrations: { type: Array, default: () => [] },
    products: { type: Array, default: () => [] },
});

/* ---------- estado real de cada integração ---------- */

const ESTADOS = {
    active: { label: 'Conectada', badge: 'andes-ui-badge--positive-quiet' },
    paused: { label: 'Pausada', badge: 'andes-ui-badge--neutral-quiet' },
    incomplete: { label: 'Falta configurar', badge: 'andes-ui-badge--caution-quiet' },
};

function listaDe(appId) {
    if (appId === 'utmify') return props.utmify_integrations ?? [];
    if (appId === 'spedy') return props.spedy_integrations ?? [];
    if (appId === 'cademi') return props.cademi_integrations ?? [];
    return [];
}

function plural(n, singular, pluralPalavra) {
    return `${n} ${n === 1 ? singular : pluralPalavra}`;
}

function produtosCobertos(itens) {
    const ids = new Set();
    itens.forEach((i) => (i.products ?? []).forEach((p) => ids.add(p.id)));
    return ids.size;
}

/** Resumo de conexão de um app: estado, números e a linha de detalhe. */
function conexao(appId) {
    if (appId === 'webhook') {
        const todos = props.webhooks ?? [];
        if (!todos.length) return { conectado: false };

        const ativos = todos.filter((w) => w.is_active);
        const eventos = new Set(todos.flatMap((w) => w.events ?? [])).size;
        const produtos = produtosCobertos(todos);

        return {
            conectado: true,
            estado: ativos.length ? 'active' : 'paused',
            detalhe: [
                plural(todos.length, 'endpoint', 'endpoints'),
                plural(eventos, 'evento', 'eventos'),
                produtos ? plural(produtos, 'produto', 'produtos') : 'todos os produtos',
            ].join(' · '),
            extra: todos[0]?.url ? `${todos[0].url}${todos.length > 1 ? ` +${todos.length - 1}` : ''}` : null,
            ativos: ativos.length,
            total: todos.length,
        };
    }

    const itens = listaDe(appId);
    if (!itens.length) return { conectado: false };

    const configuradas = itens.filter((i) => i.configured);
    const ativas = configuradas.filter((i) => i.is_active);
    const produtos = produtosCobertos(itens);

    let estado = 'incomplete';
    if (configuradas.length && ativas.length) estado = 'active';
    else if (configuradas.length) estado = 'paused';

    const nomes = itens.flatMap((i) => (i.products ?? []).map((p) => p.name));

    return {
        conectado: true,
        estado,
        detalhe: [
            plural(itens.length, 'conta', 'contas'),
            produtos ? plural(produtos, 'produto', 'produtos') : 'nenhum produto vinculado',
        ].join(' · '),
        extra: nomes.length ? (nomes.length <= 2 ? nomes.join(' · ') : `${nomes.slice(0, 2).join(' · ')} +${nomes.length - 2}`) : null,
        ativos: ativas.length,
        total: itens.length,
    };
}

const apps = computed(() => APPS_BASE.map((app) => ({ ...app, conexao: conexao(app.id) })));

const conectados = computed(() => apps.value.filter((a) => a.conexao.conectado));
const disponiveis = computed(() => apps.value.filter((a) => !a.conexao.conectado));

/* Uma lista só: o que está ligado no topo, o resto embaixo. */
const appsOrdenados = computed(() => [...conectados.value, ...disponiveis.value]);

const vinculosAtivos = computed(() => conectados.value.reduce((total, a) => total + (a.conexao.ativos ?? 0), 0));

function imagemDoApp(app) {
    const img = app.image;
    if (!img) return null;
    if (img.startsWith('http') || img.startsWith('//')) return img;
    return `/${img.replace(/^\//, '')}`;
}

/* ---------- gavetas ---------- */

const webhookSidebarOpen = ref(false);
const utmifySidebarOpen = ref(false);
const spedySidebarOpen = ref(false);
const cademiSidebarOpen = ref(false);

function closeWebhookSidebar() {
    webhookSidebarOpen.value = false;
}

function closeUtmifySidebar() {
    utmifySidebarOpen.value = false;
}

function closeSpedySidebar() {
    spedySidebarOpen.value = false;
}

function closeCademiSidebar() {
    cademiSidebarOpen.value = false;
}

function onWebhookSaved() {
    router.reload();
}

function onUtmifySaved() {
    router.reload({ only: ['utmify_integrations', 'products'] });
}

function onSpedySaved() {
    router.reload({ only: ['spedy_integrations', 'products'] });
}

function onCademiSaved() {
    router.reload({ only: ['cademi_integrations', 'products'] });
}

function onAppClick(app) {
    if (app.id === 'webhook') webhookSidebarOpen.value = true;
    else if (app.id === 'utmify') utmifySidebarOpen.value = true;
    else if (app.id === 'spedy') spedySidebarOpen.value = true;
    else if (app.id === 'cademi') cademiSidebarOpen.value = true;
}
</script>

<template>
    <div class="andes-dash andes-int">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">{{ t('integrations.title', 'Integrações') }}</h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                {{ t('integrations.subtitle', 'Conecte sua plataforma com sistemas externos via webhooks e outras integrações.') }}
            </p>
        </header>

        <div class="andes-summary">
            <span class="andes-summary__item"><b>{{ apps.length }}</b> apps disponíveis</span>
            <span class="andes-summary__item"><b>{{ conectados.length }}</b> conectados</span>
            <span class="andes-summary__item"><b>{{ vinculosAtivos }}</b> vínculos ativos</span>
        </div>

        <div class="andes-ui-card andes-ui-card--padding-none andes-panel">
            <ul class="andes-ui-list andes-panel__list">
                <li
                    v-for="app in appsOrdenados"
                    :key="app.id"
                    class="andes-ui-list__item andes-ui-list__item--size-large andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                    role="button"
                    tabindex="0"
                    @click="onAppClick(app)"
                    @keydown.enter.prevent="onAppClick(app)"
                >
                    <div class="andes-ui-list__item-content">
                        <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                            <img v-if="imagemDoApp(app)" :src="imagemDoApp(app)" :alt="app.name" />
                            <AndesIcon v-else name="sparkle" />
                        </span>
                        <span class="andes-dash__list-main">
                            <span class="andes-ui-typography tp-body-medium w-emphasis">{{ app.name }}</span>
                            <span class="andes-ui-typography tp-body-small c-secondary andes-int__linha">
                                {{ app.conexao.conectado ? app.conexao.detalhe : app.description }}
                            </span>
                            <span
                                v-if="app.conexao.conectado && app.conexao.extra"
                                class="andes-ui-typography tp-body-small c-secondary andes-int__linha"
                            >
                                {{ app.conexao.extra }}
                            </span>
                        </span>
                    </div>
                    <span class="andes-dash__list-values">
                        <span
                            v-if="app.conexao.conectado"
                            class="andes-ui-badge andes-ui-badge--medium"
                            :class="ESTADOS[app.conexao.estado].badge"
                        >
                            <span class="andes-ui-badge__content">{{ ESTADOS[app.conexao.estado].label }}</span>
                        </span>
                        <span class="andes-ui-list__item-chevron"><AndesIcon name="chevron-right" /></span>
                    </span>
                </li>
            </ul>
        </div>

        <WebhookSidebar
            :open="webhookSidebarOpen"
            :webhooks="webhooks"
            :webhook-events="webhook_events"
            :products="products"
            @close="closeWebhookSidebar"
            @saved="onWebhookSaved"
        />
        <UtmifySidebar
            :open="utmifySidebarOpen"
            :utmify_integrations="utmify_integrations"
            :products="products"
            @close="closeUtmifySidebar"
            @saved="onUtmifySaved"
        />
        <SpedySidebar
            :open="spedySidebarOpen"
            :spedy_integrations="spedy_integrations"
            :products="products"
            @close="closeSpedySidebar"
            @saved="onSpedySaved"
        />
        <CademiSidebar
            :open="cademiSidebarOpen"
            :cademi_integrations="cademi_integrations"
            :products="products"
            @close="closeCademiSidebar"
            @saved="onCademiSaved"
        />
    </div>
</template>
