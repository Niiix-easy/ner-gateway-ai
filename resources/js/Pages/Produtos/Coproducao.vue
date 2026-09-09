<script setup>
/**
 * Co-produção no design system Andes.
 *
 * O que precisa de resposta vem primeiro (convites), depois o que já está
 * valendo. Passou a mostrar dados que o servidor já mandava e a tela jogava
 * fora: sobre quais vendas a comissão incide, quem convidou, desde quando
 * vale e quanto falta para terminar.
 */
import { computed } from 'vue';
import { router } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import ProdutosTabs from '@/components/produtos/ProdutosTabs.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import { useI18n } from '@/composables/useI18n';

defineOptions({ layout: LayoutInfoprodutor });
const { t } = useI18n();

const props = defineProps({
    coproduction_pending: { type: Array, default: () => [] },
    coproduction_active: { type: Array, default: () => [] },
});

const pending = computed(() => props.coproduction_pending ?? []);
const active = computed(() => props.coproduction_active ?? []);

const comissaoMedia = computed(() => {
    if (!active.value.length) return 0;
    const soma = active.value.reduce((total, row) => total + (Number(row.commission_percent) || 0), 0);
    return Math.round((soma / active.value.length) * 10) / 10;
});

function durationPresetLabel(p) {
    if (p === 'eternal') return 'Por tempo indeterminado';
    if (['30', '60', '90', '120'].includes(String(p))) return `${p} dias`;
    return p || '—';
}

function shortDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
}

/* Sobre o que a comissão incide — o servidor manda, a tela antiga ignorava. */
function escopoComissao(row) {
    const escopos = [];
    if (row.commission_on_direct_sales) escopos.push('vendas diretas');
    if (row.commission_on_affiliate_sales) escopos.push('vendas de afiliados');
    if (!escopos.length) return 'sem escopo definido';
    return escopos.join(' e ');
}

/* Quanto falta para o vínculo acabar, para o co-produtor não ser pego de surpresa. */
function diasRestantes(row) {
    if (!row.ends_at) return null;
    const fim = new Date(row.ends_at);
    const hoje = new Date();
    const dias = Math.ceil((fim - hoje) / (1000 * 60 * 60 * 24));
    return dias >= 0 ? dias : 0;
}

function vigenciaLabel(row) {
    const partes = [];
    if (row.accepted_at || row.starts_at) {
        partes.push(`desde ${shortDate(row.accepted_at || row.starts_at)}`);
    }
    partes.push(row.ends_at ? `até ${shortDate(row.ends_at)}` : durationPresetLabel('eternal').toLowerCase());
    return partes.join(' · ');
}

function acceptInvite(token) {
    router.post(`/coproducao/convite/${token}/aceitar`, {}, { preserveScroll: true });
}

function openInvitePage(token) {
    window.location.href = `/coproducao/convite/${token}`;
}
</script>

<template>
    <div class="andes-dash andes-cop">
        <header class="andes-dash__head">
            <h1 class="andes-ui-typography tp-heading-huge">
                {{ t('products.coproduction_page_title', 'Co-produção') }}
            </h1>
            <p class="andes-ui-typography tp-body-medium c-secondary">
                {{ t('products.coproduction_page_subtitle', 'Produtos em que você é co-produtor e convites aguardando sua aprovação.') }}
            </p>
        </header>

        <ProdutosTabs />

        <!-- O que precisa de você aparece antes de qualquer número -->
        <div v-if="pending.length" class="andes-ui-message andes-ui-message--caution andes-block--tight">
            <span class="andes-ui-message__text">
                <b class="andes-ui-message__title" style="display: block">
                    {{ pending.length }}
                    {{ pending.length === 1 ? 'convite esperando sua resposta' : 'convites esperando sua resposta' }}
                </b>
                Aceitar libera a comissão a partir da próxima venda do produto.
            </span>
        </div>

        <div class="andes-summary">
            <span class="andes-summary__item"><b>{{ active.length }}</b> {{ active.length === 1 ? 'co-produção ativa' : 'co-produções ativas' }}</span>
            <span class="andes-summary__item"><b>{{ pending.length }}</b> {{ pending.length === 1 ? 'convite pendente' : 'convites pendentes' }}</span>
            <span v-if="active.length" class="andes-summary__item"><b>{{ comissaoMedia }}%</b> de comissão média</span>
        </div>

        <!-- Convites -->
        <template v-if="pending.length">
            <div class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">
                    {{ t('products.coproduction_section_pending', 'Convites pendentes') }}
                </b>
            </div>

            <ul class="andes-ui-list andes-dash__list">
                <li
                    v-for="row in pending"
                    :key="row.id"
                    class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                >
                    <div class="andes-ui-list__item-content">
                        <span class="andes-thumb">
                            <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                                <img v-if="row.product?.image_url" :src="row.product.image_url" :alt="row.product?.name" />
                                <AndesIcon v-else name="archive" />
                            </span>
                            <span class="andes-ui-badge andes-ui-badge--small andes-ui-badge--caution andes-thumb__mark" aria-hidden="true" />
                        </span>
                        <span class="andes-dash__list-main">
                            <span class="andes-ui-typography tp-body-medium w-emphasis">{{ row.product?.name }}</span>
                            <span class="andes-ui-typography tp-body-small c-secondary">
                                {{ t('products.coproduction_by', 'Produtor') }}: {{ row.product?.owner_name || '—' }}
                                <template v-if="row.inviter_name"> · convite de {{ row.inviter_name }}</template>
                            </span>
                            <span class="andes-ui-typography tp-body-small c-secondary">
                                {{ row.commission_percent }}% sobre {{ escopoComissao(row) }} · {{ durationPresetLabel(row.duration_preset) }}
                            </span>
                        </span>
                    </div>
                    <span class="andes-dash__list-values">
                        <b class="andes-ui-typography tp-heading-medium">{{ row.commission_percent }}%</b>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--mute"
                            @click="openInvitePage(row.token)"
                        >
                            {{ t('products.coproduction_details', 'Ver convite') }}
                        </button>
                        <button
                            type="button"
                            class="andes-ui-button andes-ui-button--small andes-ui-button--loud"
                            @click="acceptInvite(row.token)"
                        >
                            {{ t('products.coproduction_accept', 'Aceitar') }}
                        </button>
                    </span>
                </li>
            </ul>
        </template>

        <!-- Ativas -->
        <div class="andes-dash__sectionbar">
            <b class="andes-ui-typography tp-heading-large">
                {{ t('products.coproduction_section_active', 'Co-produções ativas') }}
            </b>
        </div>

        <ul v-if="active.length" class="andes-ui-list andes-dash__list">
            <li
                v-for="row in active"
                :key="row.id"
                class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
            >
                <div class="andes-ui-list__item-content">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                        <img v-if="row.product?.image_url" :src="row.product.image_url" :alt="row.product?.name" />
                        <AndesIcon v-else name="hand-shake" />
                    </span>
                    <span class="andes-dash__list-main">
                        <span class="andes-ui-typography tp-body-medium w-emphasis">{{ row.product?.name }}</span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ t('products.coproduction_by', 'Produtor') }}: {{ row.product?.owner_name || '—' }}
                        </span>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ row.commission_percent }}% sobre {{ escopoComissao(row) }} · {{ vigenciaLabel(row) }}
                        </span>
                        <a
                            v-if="row.product?.checkout_slug"
                            :href="`/c/${row.product.checkout_slug}`"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="andes-ui-textlink andes-ui-textlink--small"
                        >
                            {{ t('products.coproduction_view_checkout', 'Ver checkout') }}
                            <AndesIcon name="link" />
                        </a>
                    </span>
                </div>
                <span class="andes-dash__list-values">
                    <span
                        v-if="diasRestantes(row) !== null && diasRestantes(row) <= 30"
                        class="andes-ui-badge andes-ui-badge--medium andes-ui-badge--caution-quiet"
                    >
                        <span class="andes-ui-badge__content">
                            {{ diasRestantes(row) === 0 ? 'Termina hoje' : `Termina em ${diasRestantes(row)} dias` }}
                        </span>
                    </span>
                    <b class="andes-ui-typography tp-heading-medium">{{ row.commission_percent }}%</b>
                </span>
            </li>
        </ul>

        <div v-else class="andes-ui-card andes-ui-card--padding-large">
            <div class="andes-empty">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="hand-shake" />
                </span>
                <b class="andes-ui-typography tp-heading-medium">
                    {{ t('products.coproduction_empty_active', 'Nenhuma co-produção ativa ainda.') }}
                </b>
                <span class="andes-ui-typography tp-body-small c-secondary">
                    Quando um produtor te convidar como co-produtor, o convite aparece aqui para você aceitar.
                </span>
            </div>
        </div>
    </div>
</template>
