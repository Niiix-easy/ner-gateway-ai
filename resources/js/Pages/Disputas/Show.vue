<script setup>
/**
 * Defesa da disputa MED no design system Andes: o valor contestado e o prazo
 * primeiro, as provas depois, o formulário de defesa por último.
 */
import { computed } from 'vue';
import { useForm, usePage, Link, router } from '@inertiajs/vue3';
import LayoutInfoprodutor from '@/Layouts/LayoutInfoprodutor.vue';
import VendasTabs from '@/components/vendas/VendasTabs.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';

defineOptions({ layout: LayoutInfoprodutor });

const props = defineProps({
    dispute: { type: Object, required: true },
});

const page = usePage();

const form = useForm({
    text: '',
    attachments: [],
});

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

const statusLabel = computed(() => STATUS_LABEL[props.dispute.status] ?? props.dispute.status);
const statusBadgeClass = computed(() => STATUS_BADGE[props.dispute.status] ?? 'andes-ui-badge--neutral-quiet');

function formatDate(value) {
    return value ? new Date(value).toLocaleString('pt-BR') : '—';
}

function onFiles(e) {
    form.attachments = Array.from(e.target.files || []);
}

function submitDefense() {
    form.post(`/vendas/disputas/${props.dispute.id}/defesa`, {
        forceFormData: true,
        preserveScroll: true,
    });
}

function generateDossier() {
    router.post(`/vendas/disputas/${props.dispute.id}/gerar-dossie`, {}, { preserveScroll: true });
}
</script>

<template>
    <div class="andes-dash andes-med">
        <VendasTabs />

        <Link href="/vendas/disputas" class="andes-ui-textlink andes-block--tight" style="display: inline-flex">
            <AndesIcon name="forward" style="transform: rotate(180deg)" />
            Voltar às disputas
        </Link>

        <div v-if="page.props.flash?.success" class="andes-ui-message andes-ui-message--positive andes-block--tight">
            <span class="andes-ui-message__text">{{ page.props.flash.success }}</span>
        </div>
        <div v-if="page.props.flash?.error" class="andes-ui-message andes-ui-message--negative andes-block--tight">
            <span class="andes-ui-message__text">{{ page.props.flash.error }}</span>
        </div>

        <div class="andes-ui-card andes-ui-card--padding-huge andes-block--tight">
            <div class="andes-toolbar" style="margin-bottom: 16px">
                <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                    <AndesIcon name="shield" />
                </span>
                <span class="andes-dash__list-main">
                    <b class="andes-ui-typography tp-heading-large">
                        Pedido #{{ dispute.order?.public_reference ?? dispute.order?.id }}
                    </b>
                    <span v-if="dispute.reason" class="andes-ui-typography tp-body-small c-secondary">{{ dispute.reason }}</span>
                </span>
                <div class="andes-toolbar__end">
                    <span class="andes-ui-badge andes-ui-badge--large" :class="statusBadgeClass">
                        <span class="andes-ui-badge__content">{{ statusLabel }}</span>
                    </span>
                </div>
            </div>

            <div class="andes-ui-typography tp-body-small c-secondary" style="margin-bottom: 4px">Valor contestado</div>
            <div class="andes-dash__hero-value">
                <AndesMoney :value="(Number(dispute.amount_cents) || 0) / 100" size="xhuge" cents="sups" />
            </div>

            <dl class="andes-dl" style="margin-top: 20px">
                <div v-if="dispute.txid" class="andes-dl__full">
                    <dt>TXID</dt>
                    <dd><code class="andes-code">{{ dispute.txid }}</code></dd>
                </div>
                <div v-if="dispute.defended_at">
                    <dt>Defesa enviada em</dt>
                    <dd>{{ formatDate(dispute.defended_at) }}</dd>
                </div>
            </dl>

            <div v-if="dispute.defense_text" class="andes-ui-message andes-ui-message--informative" style="margin-top: 16px">
                <span class="andes-ui-message__text">{{ dispute.defense_text }}</span>
            </div>

            <div class="andes-actions" style="justify-content: flex-start; margin-top: 20px">
                <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--quiet" @click="generateDossier">
                    <AndesIcon name="document-text" />
                    Gerar prova de entrega
                </button>
                <a
                    v-if="dispute.has_dossier"
                    :href="`/vendas/disputas/${dispute.id}/dossie`"
                    class="andes-ui-button andes-ui-button--medium andes-ui-button--mute"
                >
                    <AndesIcon name="download" />
                    Baixar dossiê
                </a>
            </div>
        </div>

        <template v-if="dispute.is_open">
            <div class="andes-dash__sectionbar">
                <b class="andes-ui-typography tp-heading-large">Enviar defesa à CajuPay</b>
            </div>
            <div class="andes-ui-card andes-ui-card--padding-large">
                <form class="andes-form andes-form--wide" @submit.prevent="submitDefense">
                    <div class="andes-ui-form-control">
                        <label class="andes-ui-form-control__label" for="defesa-texto">Descrição da entrega</label>
                        <textarea
                            id="defesa-texto"
                            v-model="form.text"
                            rows="6"
                            required
                            class="andes-ui-input"
                            placeholder="Explique o motivo da venda e comprove a entrega..."
                        />
                        <p class="andes-ui-form-control__help">
                            Descreva a entrega do produto ou serviço. Até 10 anexos (PDF, JPG, PNG), 8 MiB cada.
                        </p>
                        <p v-if="form.errors.text" class="andes-error">{{ form.errors.text }}</p>
                    </div>
                    <div class="andes-ui-form-control">
                        <label class="andes-ui-form-control__label" for="defesa-anexos">Anexos</label>
                        <input
                            id="defesa-anexos"
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            class="andes-ui-input andes-ui-input--file"
                            @change="onFiles"
                        />
                        <p v-if="form.attachments.length" class="andes-ui-form-control__help">
                            {{ form.attachments.length }} arquivo(s) selecionado(s)
                        </p>
                        <p v-if="form.errors.attachments" class="andes-error">{{ form.errors.attachments }}</p>
                    </div>
                    <div class="andes-actions">
                        <button type="submit" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" :disabled="form.processing">
                            {{ form.processing ? 'Enviando...' : 'Enviar defesa' }}
                        </button>
                    </div>
                </form>
            </div>
        </template>

        <div v-else class="andes-ui-message andes-ui-message--neutral">
            <span class="andes-ui-message__text">Esta disputa não aceita mais defesa.</span>
        </div>
    </div>
</template>
