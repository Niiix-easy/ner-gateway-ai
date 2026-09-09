<script setup>
/**
 * Detalhe da comissão de afiliado como gaveta do design system Andes.
 * Mesma composição da gaveta de venda: resumo primeiro (o que você ganhou),
 * depois os pares rótulo/valor.
 */
import { computed } from 'vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

const props = defineProps({
    open: { type: Boolean, default: false },
    venda: { type: Object, default: null },
});

const emit = defineEmits(['close']);

useBodyScrollLock(() => props.open);

function close() {
    emit('close');
}

function formatDate(value) {
    if (!value) return '–';
    return new Date(value).toLocaleString('pt-BR');
}

function shortDate(value) {
    if (!value) return '–';
    const d = new Date(value);
    const dia = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
    return `${dia} · ${hora}`;
}

const STATUS_BADGE = {
    approved: 'andes-ui-badge--positive-quiet',
    pending: 'andes-ui-badge--caution-quiet',
    cancelled: 'andes-ui-badge--neutral-quiet',
    refunded: 'andes-ui-badge--negative-quiet',
};

const statusBadgeClass = computed(() => STATUS_BADGE[props.venda?.status] ?? 'andes-ui-badge--neutral-quiet');

const amountTone = computed(() =>
    ['refunded', 'cancelled'].includes(props.venda?.status) ? 'strikethrough' : '',
);
</script>

<template>
    <Teleport to="body">
        <div v-show="open" class="andes-dash andes-drawer" style="z-index: 100000" aria-modal="true" role="dialog">
            <div class="andes-modal__veil" aria-hidden="true" @click="close" />

            <aside class="andes-ui-card andes-ui-card--padding-none andes-drawer__card">
                <header class="andes-drawer__head">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                        <AndesIcon name="hand-shake" />
                    </span>
                    <b class="andes-ui-typography tp-heading-large">Detalhes da comissão</b>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                        style="width: 32px; height: 32px; min-height: 32px; margin-left: auto"
                        aria-label="Fechar"
                        @click="close"
                    >
                        <AndesIcon name="close" />
                    </button>
                </header>

                <div v-if="!venda" class="andes-empty">
                    <span class="andes-ui-typography tp-body-medium c-secondary">Nenhuma venda selecionada.</span>
                </div>

                <template v-else>
                    <div class="andes-drawer__summary">
                        <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 4px">Sua comissão</div>
                        <AndesMoney :value="Number(venda.commission_net) || 0" :tone="amountTone" size="xhuge" cents="sups" />
                        <div class="andes-drawer__summary-meta">
                            <span class="andes-ui-badge andes-ui-badge--large" :class="statusBadgeClass">
                                <span class="andes-ui-badge__content">{{ venda.status_label ?? venda.status ?? '–' }}</span>
                            </span>
                            <span class="andes-ui-typography tp-body-small c-secondary">
                                {{ venda.commission_percent }}% · {{ shortDate(venda.created_at) }}
                            </span>
                        </div>

                        <div v-if="venda.affiliate_link" class="andes-ui-shortcuts andes-drawer__actions">
                            <a :href="venda.affiliate_link" target="_blank" rel="noopener noreferrer" class="andes-ui-shortcut">
                                <span class="andes-ui-shortcut__icon"><AndesIcon name="link" /></span>
                                <span class="andes-ui-shortcut__label">Link</span>
                            </a>
                        </div>
                    </div>

                    <div class="andes-drawer__body">
                        <dl class="andes-dl">
                            <div class="andes-dl__full">
                                <dt>Produto</dt>
                                <dd>{{ venda.product_name ?? '—' }}</dd>
                            </div>
                            <div class="andes-dl__full">
                                <dt>Cliente</dt>
                                <dd v-if="venda.customer_hidden" class="c-secondary">Dados ocultos pelo produtor</dd>
                                <dd v-else>
                                    {{ venda.customer_name ?? '—' }}
                                    <span class="andes-ui-typography tp-body-small c-secondary" style="display: block">
                                        {{ venda.customer_email ?? '' }}
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt>Valor da venda</dt>
                                <dd>
                                    <AndesMoney :value="Number(venda.sale_gross) || 0" size="small" cents="comma" />
                                </dd>
                            </div>
                            <div>
                                <dt>Produtor</dt>
                                <dd>{{ venda.producer_name ?? '—' }}</dd>
                            </div>
                            <div>
                                <dt>Método de pagamento</dt>
                                <dd>{{ venda.payment_method_label ?? venda.payment_method ?? '—' }}</dd>
                            </div>
                            <div>
                                <dt>Origem</dt>
                                <dd>{{ venda.sale_origin_label ?? '—' }}</dd>
                            </div>
                            <div v-if="venda.affiliate_ref" class="andes-dl__full">
                                <dt>Ref. afiliado</dt>
                                <dd><code class="andes-code">{{ venda.affiliate_ref }}</code></dd>
                            </div>
                            <div class="andes-dl__full">
                                <dt>Data</dt>
                                <dd>{{ formatDate(venda.created_at) }}</dd>
                            </div>
                            <div class="andes-dl__full">
                                <dt>ID da venda</dt>
                                <dd><code class="andes-code">{{ venda.order_id }}</code></dd>
                            </div>
                        </dl>
                    </div>
                </template>
            </aside>
        </div>
    </Teleport>
</template>
