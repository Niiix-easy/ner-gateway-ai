<script setup>
/**
 * Criar produto — gaveta em dois passos no design system Andes.
 *
 * Passo 1: escolher o tipo, na anatomia de lista do guia (miniatura ·
 * conteúdo · chevron). Passo 2: o formulário, com o tipo escolhido virando
 * ficha clicável para voltar, e a ação principal fixa no rodapé.
 */
import { ref, computed, watch } from 'vue';
import { useForm, usePage } from '@inertiajs/vue3';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import { useI18n } from '@/composables/useI18n';
import { sanitizeHtmlAllowlist } from '@/lib/sanitizeHtml';
import { normalizeMoneyInput } from '@/lib/moneyDecimal';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

const props = defineProps({
    open: { type: Boolean, default: false },
    productTypes: { type: Array, default: () => [] },
    billingTypes: { type: Array, default: () => [] },
    exchangeRates: { type: Object, default: () => ({ brl_eur: 0.16, brl_usd: 0.18 }) },
    pluginFormSections: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'success']);

useBodyScrollLock(() => props.open);
const { t } = useI18n();
const page = usePage();

const platformMinCharge = computed(() => Number(page.props.platform_minimum_charge_brl ?? 0));
const platformMinChargeLabel = computed(() =>
    platformMinCharge.value > 0
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(platformMinCharge.value)
        : null
);

const step = ref(1);
const selectedType = ref(null);
const imagePreview = ref(null);

/* Ícones do kit do guia por tipo de entrega. */
const TYPE_ICONS = {
    aplicativo: 'code-scan',
    area_membros: 'documents',
    link: 'link',
    link_pagamento: 'card',
    produto_fisico: 'bus',
};

function typeIcon(value) {
    return TYPE_ICONS[value] ?? 'archive';
}

const form = useForm({
    name: '',
    description: '',
    type: '',
    billing_type: 'one_time',
    price: '',
    currency: 'BRL',
    is_active: true,
    image: null,
    deliverable_link: '',
});

const priceNum = computed(() => parseFloat(String(form.price).replace(',', '.')) || 0);
const priceEur = computed(() => (priceNum.value * (props.exchangeRates.brl_eur ?? 0.16)).toFixed(2));
const priceUsd = computed(() => (priceNum.value * (props.exchangeRates.brl_usd ?? 0.18)).toFixed(2));

const availableTypes = computed(() => props.productTypes.filter((tp) => tp.available));
const comingSoonTypes = computed(() => props.productTypes.filter((tp) => !tp.available));

const selectedTypeLabel = computed(
    () => props.productTypes.find((tp) => tp.value === selectedType.value)?.label ?? '',
);

/* Erro que não pertence a nenhum campo aparece como mensagem no topo. */
const generalError = computed(() => {
    if (form.errors.image) return form.errors.image;
    if (form.hasErrors && !form.errors.name && !form.errors.price) {
        return Object.values(form.errors)[0];
    }
    return null;
});

function selectType(type) {
    if (!type.available) return;
    selectedType.value = type.value;
    form.type = type.value;
    step.value = 2;
}

function back() {
    step.value = 1;
    selectedType.value = null;
    form.type = '';
}

function resetAll() {
    step.value = 1;
    selectedType.value = null;
    imagePreview.value = null;
    form.reset();
}

function close() {
    resetAll();
    emit('close');
}

function submit() {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description ?? '');
    fd.append('type', form.type);
    fd.append('billing_type', form.billing_type);
    fd.append('price', String(normalizeMoneyInput(form.price)));
    fd.append('currency', form.currency);
    fd.append('is_active', form.is_active ? '1' : '0');
    if (form.deliverable_link) {
        fd.append('deliverable_link', form.deliverable_link);
    }
    if (form.image instanceof File) {
        fd.append('image', form.image);
    }

    form.transform(() => fd).post('/produtos', {
        forceFormData: true,
        onSuccess: () => {
            close();
            emit('success');
        },
    });
}

function onFileChange(e) {
    const file = e.target.files?.[0];
    form.image = file || null;
    imagePreview.value = file ? URL.createObjectURL(file) : null;
}

function removeImage() {
    form.image = null;
    imagePreview.value = null;
}

watch(
    () => props.open,
    (isOpen) => {
        if (!isOpen) {
            resetAll();
        }
    }
);

function safePluginSectionHtml(html) {
    return sanitizeHtmlAllowlist(html, {
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    });
}
</script>

<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="andes-dash andes-drawer"
            style="z-index: 100000"
            aria-modal="true"
            role="dialog"
            aria-labelledby="produto-drawer-title"
        >
            <div class="andes-modal__veil" aria-hidden="true" @click="close" />

            <aside class="andes-ui-card andes-ui-card--padding-none andes-drawer__card" @click.stop>
                <header class="andes-drawer__head">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                        <AndesIcon name="archive" />
                    </span>
                    <span class="andes-dash__list-main">
                        <b id="produto-drawer-title" class="andes-ui-typography tp-heading-large">
                            {{ t('products.create.new_product', 'Novo produto') }}
                        </b>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            {{ step === 1
                                ? t('products.create.step_type', 'Passo 1 de 2 · tipo de entrega')
                                : t('products.create.step_form', 'Passo 2 de 2 · dados do produto') }}
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

                <div class="andes-progress andes-drawer__progress" role="presentation">
                    <div class="andes-progress__bar" :style="{ width: step === 1 ? '50%' : '100%' }" />
                </div>

                <!-- Passo 1: tipo de entrega -->
                <div v-if="step === 1" class="andes-drawer__body">
                    <p class="andes-ui-typography tp-body-medium c-secondary andes-block--tight">
                        {{ t('products.create.choose_delivery_type', 'Escolha o tipo de entrega do produto.') }}
                    </p>

                    <ul class="andes-ui-list">
                        <li
                            v-for="typeOption in availableTypes"
                            :key="typeOption.value"
                            class="andes-ui-list__item andes-ui-list__item--size-large andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-ui-list__item--selectable"
                            role="button"
                            tabindex="0"
                            @click="selectType(typeOption)"
                            @keydown.enter.prevent="selectType(typeOption)"
                        >
                            <div class="andes-ui-list__item-content">
                                <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                                    <AndesIcon :name="typeIcon(typeOption.value)" />
                                </span>
                                <span class="andes-dash__list-main">
                                    <span class="andes-ui-typography tp-body-medium w-emphasis">{{ typeOption.label }}</span>
                                    <span class="andes-ui-typography tp-body-small c-secondary">{{ typeOption.description }}</span>
                                </span>
                            </div>
                            <span class="andes-ui-list__item-chevron"><AndesIcon name="chevron-right" /></span>
                        </li>

                        <li
                            v-for="typeOption in comingSoonTypes"
                            :key="`soon-${typeOption.value}`"
                            class="andes-ui-list__item andes-ui-list__item--size-large andes-ui-list__item--padding-x-small andes-ui-list__item--divider andes-prod__soon"
                            aria-disabled="true"
                        >
                            <div class="andes-ui-list__item-content">
                                <span class="andes-ui-thumbnail andes-ui-thumbnail--large andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                                    <AndesIcon :name="typeIcon(typeOption.value)" />
                                </span>
                                <span class="andes-dash__list-main">
                                    <span class="andes-ui-typography tp-body-medium w-emphasis">{{ typeOption.label }}</span>
                                    <span class="andes-ui-typography tp-body-small c-secondary">{{ typeOption.description }}</span>
                                </span>
                            </div>
                            <span class="andes-ui-badge andes-ui-badge--medium andes-ui-badge--neutral-quiet">
                                <span class="andes-ui-badge__content">{{ t('common.coming_soon', 'Em breve') }}</span>
                            </span>
                        </li>
                    </ul>
                </div>

                <!-- Passo 2: dados -->
                <template v-else>
                    <div class="andes-drawer__body">
                        <div v-if="generalError" class="andes-ui-message andes-ui-message--negative andes-block--tight">
                            <span class="andes-ui-message__text">{{ generalError }}</span>
                        </div>

                        <div class="andes-chips">
                            <button type="button" class="andes-chip andes-chip--action" @click="back">
                                <AndesIcon name="chevron-right" style="transform: rotate(180deg)" />
                                {{ selectedTypeLabel }}
                            </button>
                        </div>

                        <form id="produto-create-form" class="andes-form andes-form--wide" @submit.prevent="submit">
                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="prod-nome">{{ t('common.name', 'Nome') }}</label>
                                <input
                                    id="prod-nome"
                                    v-model="form.name"
                                    type="text"
                                    required
                                    class="andes-ui-input"
                                    :placeholder="t('products.create.name_placeholder', 'Ex: Curso de Desenvolvimento Web')"
                                />
                                <p v-if="form.errors.name" class="andes-error">{{ form.errors.name }}</p>
                            </div>

                            <div class="andes-ui-form-control">
                                <span class="andes-ui-form-control__label">
                                    {{ t('products.create.billing_type', 'Tipo de cobrança') }}
                                </span>
                                <div class="andes-segmented">
                                    <button
                                        v-for="bt in billingTypes"
                                        :key="bt.value"
                                        type="button"
                                        class="andes-ui-button andes-ui-button--medium"
                                        :class="form.billing_type === bt.value ? 'andes-ui-button--quiet' : 'andes-ui-button--mute'"
                                        :aria-pressed="form.billing_type === bt.value ? 'true' : 'false'"
                                        @click="form.billing_type = bt.value"
                                    >
                                        {{ bt.label }}
                                    </button>
                                </div>
                            </div>

                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="prod-preco">
                                    {{ t('products.create.price_brl', 'Preço') }}
                                </label>
                                <div class="andes-inputgroup">
                                    <span class="andes-inputgroup__prefix">R$</span>
                                    <input
                                        id="prod-preco"
                                        v-model="form.price"
                                        type="number"
                                        step="any"
                                        :min="platformMinCharge"
                                        inputmode="decimal"
                                        required
                                        class="andes-ui-input"
                                        placeholder="0,00"
                                    />
                                </div>
                                <p class="andes-ui-form-control__help">
                                    ≈ € {{ priceEur }} · $ {{ priceUsd }}
                                    <template v-if="platformMinChargeLabel">
                                        · mínimo da plataforma {{ platformMinChargeLabel }}
                                    </template>
                                </p>
                                <p v-if="form.errors.price" class="andes-error">{{ form.errors.price }}</p>
                            </div>

                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="prod-desc">
                                    {{ t('common.description', 'Descrição') }}
                                </label>
                                <textarea
                                    id="prod-desc"
                                    v-model="form.description"
                                    rows="3"
                                    class="andes-ui-input"
                                    :placeholder="t('products.create.description_placeholder', 'Breve descrição do produto')"
                                />
                            </div>

                            <div v-if="form.type === 'link'" class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="prod-link">
                                    {{ t('products.create.deliverable_link', 'Link do entregável') }}
                                </label>
                                <input id="prod-link" v-model="form.deliverable_link" type="url" class="andes-ui-input" placeholder="https://..." />
                                <p class="andes-ui-form-control__help">
                                    {{ t('products.create.deliverable_link_hint', 'Enviado por e-mail após a compra.') }}
                                </p>
                                <p v-if="form.errors.deliverable_link" class="andes-error">{{ form.errors.deliverable_link }}</p>
                            </div>

                            <div class="andes-ui-form-control">
                                <span class="andes-ui-form-control__label">{{ t('common.image', 'Imagem') }}</span>
                                <div class="andes-upload">
                                    <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                                        <img v-if="imagePreview" :src="imagePreview" alt="" />
                                        <AndesIcon v-else name="archive" />
                                    </span>
                                    <div class="andes-upload__side">
                                        <label class="andes-ui-button andes-ui-button--small andes-ui-button--quiet" for="prod-imagem">
                                            <AndesIcon name="import" />
                                            {{ form.image ? t('common.change', 'Trocar') : t('common.choose_file', 'Escolher imagem') }}
                                        </label>
                                        <input id="prod-imagem" type="file" accept="image/*" class="andes-upload__input" @change="onFileChange" />
                                        <button
                                            v-if="form.image"
                                            type="button"
                                            class="andes-ui-textlink andes-ui-textlink--small"
                                            @click="removeImage"
                                        >
                                            {{ t('common.remove', 'Remover') }}
                                        </button>
                                        <span class="andes-ui-form-control__help">
                                            {{ t('products.create.image_hint', 'Exibida em formato quadrado (1:1).') }}
                                        </span>
                                    </div>
                                </div>
                                <p v-if="form.errors.image" class="andes-error">{{ form.errors.image }}</p>
                            </div>

                            <label class="andes-ui-choice">
                                <input v-model="form.is_active" type="checkbox" class="andes-ui-checkbox" />
                                <span class="andes-dash__list-main">
                                    <span class="andes-ui-typography tp-body-medium">
                                        {{ t('products.create.active_product', 'Produto ativo') }}
                                    </span>
                                    <span class="andes-ui-typography tp-body-small c-secondary">
                                        {{ t('products.create.active_hint', 'O checkout entra no ar assim que o produto for criado.') }}
                                    </span>
                                </span>
                            </label>

                            <div v-if="pluginFormSections?.length" class="andes-prod__plugins">
                                <template v-for="(section, idx) in pluginFormSections" :key="idx">
                                    <div v-if="section.html" v-html="safePluginSectionHtml(section.html)" />
                                    <div v-else-if="section.slot" class="andes-ui-typography tp-body-small c-secondary">
                                        {{ section.slot }}
                                    </div>
                                </template>
                            </div>
                        </form>
                    </div>

                    <!-- A ação principal não some no fim do rolo -->
                    <footer class="andes-drawer__foot">
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="close">
                            {{ t('common.cancel', 'Cancelar') }}
                        </button>
                        <button
                            type="submit"
                            form="produto-create-form"
                            class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                            :disabled="form.processing"
                        >
                            {{ form.processing ? t('common.saving', 'Criando...') : t('products.create.create_product', 'Criar produto') }}
                        </button>
                    </footer>
                </template>
            </aside>
        </div>
    </Teleport>
</template>
