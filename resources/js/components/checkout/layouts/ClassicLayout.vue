<script setup>
/**
 * Layout "Clássico" do checkout.
 *
 * F1 da migração: casca visual apenas. Os campos são estáticos de propósito —
 * o motor de pagamento (CheckoutForm.vue) só é plugado na fase seguinte, para
 * que nada aqui possa derrubar venda enquanto o visual está em aprovação.
 *
 * As cores saem todas de CSS vars (--theme-color, --contrast-color,
 * --secondary-color, --payment-button-color, --border-radius) para o editor
 * poder trocar tema sem recompilar classe.
 */
import { computed, ref } from 'vue';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from 'lucide-vue-next';

const props = defineProps({
    /** Bloco `config` do checkout (mesma forma do defaultCheckoutConfig). */
    config: { type: Object, default: () => ({}) },
    /** Produto/loja exibidos no resumo. */
    store: { type: Object, default: () => ({}) },
    items: { type: Array, default: () => [] },
    orderBumps: { type: Array, default: () => [] },
    /** Métodos habilitados, na ordem de exibição. */
    paymentMethods: { type: Array, default: () => ['card', 'pix', 'boleto'] },
    /** Exibe os passos de entrega (produto físico). */
    requiresShipping: { type: Boolean, default: false },
    /** Valor do frete já calculado; 0 vira o selo "Grátis", como na referência. */
    shipping: { type: Number, default: 0 },
});

/* Inversão de colunas: na referência é `invert_columns_flag`, e o único
   efeito é trocar a ordem do formulário e do carrinho no desktop. */
const invertColumns = computed(() => Boolean(props.config?.resources?.invert_columns));

/* Prova social: imagens de depoimento na coluna do carrinho, em carrossel
   (padrão) ou empilhadas. */
const pixDiscount = computed(() => Number(props.config?.resources?.discounts?.pix) || 0);
const boletoDiscount = computed(() => Number(props.config?.resources?.discounts?.boleto) || 0);
const socialProof = computed(() => props.config?.post_cart?.social_proof ?? {});
const socialProofImages = computed(() =>
    Array.isArray(socialProof.value.images) ? socialProof.value.images.filter(Boolean) : []
);
const socialProofIndex = ref(0);

function socialProofPrev() {
    const n = socialProofImages.value.length;
    if (!n) return;
    socialProofIndex.value = (socialProofIndex.value - 1 + n) % n;
}

function socialProofNext() {
    const n = socialProofImages.value.length;
    if (!n) return;
    socialProofIndex.value = (socialProofIndex.value + 1) % n;
}


const visual = computed(() => props.config?.visual ?? {});
const theme = computed(() => visual.value?.theme ?? {});
const resources = computed(() => props.config?.resources ?? {});

const rootStyle = computed(() => ({
    '--theme-color': theme.value.theme_color || '#2135fa',
    '--contrast-color': theme.value.contrast_color || '#FFFFFF',
    '--secondary-color': theme.value.secondary_color || '#F4F6FB',
    '--payment-button-color': theme.value.payment_button_color || '#59BF75',
    '--border-radius': theme.value.border_radius || '0.5rem',
    backgroundColor: theme.value.background_color || '#F4F6FB',
}));

const method = ref(props.paymentMethods[0] ?? 'card');
const cartOpenMobile = ref(resources.value?.cart?.start_open === true);
const couponOpen = ref(false);
const bannerIndex = ref(0);

const banners = computed(() => (Array.isArray(visual.value.banners) ? visual.value.banners : []));
const timer = computed(() => resources.value?.timer ?? {});
const marquee = computed(() => resources.value?.marquee ?? {});

const currency = (v) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

const subtotal = computed(() => props.items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0));
const total = computed(() => subtotal.value);
const itemCount = computed(() => props.items.reduce((s, i) => s + Number(i.qty || 1), 0));

const stepPayment = computed(() => (props.requiresShipping ? '3' : '2'));

const methodLabels = { card: 'Cartão', pix: 'Pix', boleto: 'Boleto' };

/** Passo ativo: só o primeiro fica destacado enquanto o form não está plugado. */
const activeStep = ref(1);
</script>

<template>
    <div data-checkout-layout="classic" class="min-h-full w-full pb-10" :style="rootStyle">
        <!-- Logo da loja -->
        <div v-if="visual.logo_url" class="px-4 py-4">
            <div
                class="mx-auto flex items-center"
                :class="visual.logo_align === 'center' ? 'justify-center' : 'justify-start'"
                style="max-width: 60rem"
            >
                <div class="h-20 w-auto max-w-[140px]">
                    <img :src="visual.logo_url" :alt="store.name" class="block h-full w-full object-contain" />
                </div>
                <span
                    v-if="!visual.hide_store_name"
                    class="ml-3 text-base font-bold tracking-tight text-[#313C52]"
                >
                    {{ store.name }}
                </span>
            </div>
        </div>

        <!-- Temporizador -->
        <div
            v-if="timer.enabled"
            class="left-0 right-0 z-40 bg-[var(--theme-color)]"
            :class="timer.position === 'bottom' ? 'sticky bottom-0' : 'sticky top-0'"
        >
            <div class="flex items-center justify-center gap-6 px-2 py-2">
                <span class="text-sm font-normal uppercase leading-4 text-[var(--contrast-color)]">
                    {{ timer.message || 'Oferta termina em' }}
                </span>
                <div class="flex items-center justify-start gap-1">
                    <div v-for="(unit, i) in [['00', 'HORAS'], ['08', 'MIN'], ['52', 'SEG']]" :key="unit[1]" class="contents">
                        <div class="flex flex-col items-center gap-1">
                            <span
                                class="w-14 text-center text-xl font-bold leading-5 tracking-tighter text-[var(--contrast-color)]"
                            >
                                {{ unit[0] }}
                            </span>
                            <span class="text-[0.625rem] font-normal leading-[0.625rem] text-[var(--contrast-color)]">
                                {{ unit[1] }}
                            </span>
                        </div>
                        <span
                            v-if="i < 2"
                            class="mb-5 animate-pulse text-xl font-bold leading-10 text-[var(--contrast-color)]"
                        >
                            :
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Letreiro -->
        <div
            v-if="marquee.enabled && marquee.text"
            class="z-40 flex items-center overflow-hidden bg-[var(--secondary-color)]"
        >
            <p class="m-0 px-4 py-2 text-base font-bold text-[var(--contrast-color)]">
                <span :class="marquee.mode === 'scroll' ? 'whitespace-nowrap' : 'leading-relaxed'">
                    {{ marquee.text }}
                </span>
            </p>
        </div>

        <!-- Banner de topo -->
        <div v-if="banners.length" class="mx-auto mb-6 mt-4 w-11/12 max-w-[60rem]">
            <div class="overflow-hidden rounded-lg">
                <div class="relative">
                    <img
                        :src="banners[bannerIndex]?.desktop || banners[bannerIndex]"
                        alt=""
                        class="h-full w-full object-cover"
                    />
                    <div
                        v-if="banners.length > 1"
                        class="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5"
                    >
                        <button
                            v-for="(b, i) in banners"
                            :key="i"
                            type="button"
                            class="h-2 w-2 rounded-full transition-colors"
                            :class="i === bannerIndex ? 'bg-white' : 'bg-white/50'"
                            @click="bannerIndex = i"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- Carrinho recolhível (mobile) -->
        <div class="lg:hidden">
            <div class="mx-auto mb-6 mt-6 w-11/12 rounded-lg bg-white px-4 py-4">
                <button type="button" class="flex w-full items-center justify-between" @click="cartOpenMobile = !cartOpenMobile">
                    <div class="flex flex-col items-start gap-1.5">
                        <span class="text-base font-semibold leading-5 tracking-tight text-[#313C52]">
                            {{ store.name }}
                        </span>
                        <p class="text-sm text-gray-600">{{ itemCount }} {{ itemCount === 1 ? 'item' : 'itens' }}</p>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="mr-2 text-base font-semibold leading-5 tracking-tight text-[#59BF75]">
                            {{ currency(total) }}
                        </span>
                        <span class="text-xs font-medium text-[#313C52]">
                            {{ resources?.cart?.toggle_label || 'ver carrinho' }}
                        </span>
                        <component :is="cartOpenMobile ? ChevronUp : ChevronDown" class="h-4 w-4 text-[#313C52]" />
                    </div>
                </button>

                <div v-if="cartOpenMobile" class="mt-4 space-y-4 border-t border-[#EBEBEB] pt-4">
                    <div v-for="item in items" :key="item.id" class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <img
                                v-if="item.image"
                                :src="item.image"
                                alt=""
                                class="h-12 w-12 shrink-0 rounded object-cover"
                            />
                            <div>
                                <p class="text-sm font-semibold leading-5 text-[#313C52]">{{ item.name }}</p>
                                <p class="text-xs text-gray-600">{{ item.qty || 1 }} un.</p>
                            </div>
                        </div>
                        <span class="text-sm font-semibold text-[#313C52]">{{ currency(item.price) }}</span>
                    </div>
                    <div class="flex items-center justify-between border-t border-[#EBEBEB] pt-3">
                        <span class="text-sm text-gray-600">Total</span>
                        <span class="text-base font-semibold leading-5 tracking-tight text-[#59BF75]">
                            {{ currency(total) }}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Corpo -->
        <div
            class="mx-auto mt-4 flex w-11/12 max-w-[60rem] flex-col gap-10"
            :class="invertColumns ? 'lg:flex-row-reverse' : 'lg:flex-row'"
        >
            <!-- Coluna do formulário -->
            <div class="flex h-min w-full flex-col gap-6">
                <!-- Passos -->
                <div class="mt-0 flex items-center justify-between rounded-lg bg-white p-6">
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold leading-5"
                            :class="
                                activeStep >= 1
                                    ? 'bg-[var(--theme-color)] text-[var(--contrast-color)]'
                                    : 'bg-[#F4F6FB] text-[#939598]'
                            "
                        >
                            <span>1</span>
                        </div>
                        <span
                            class="text-sm font-semibold leading-5 tracking-tight md:text-base"
                            :class="activeStep >= 1 ? 'text-[#313C52]' : 'text-[#939598]'"
                        >
                            Identificação
                        </span>
                    </div>

                    <div v-if="requiresShipping" class="flex flex-1 items-center justify-center gap-3">
                        <div class="h-0.5 max-w-[3rem] flex-1 bg-[#DDDDDD]"></div>
                        <div class="flex items-center gap-3">
                            <div
                                class="flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold leading-5"
                                :class="
                                    activeStep >= 2
                                        ? 'bg-[var(--theme-color)] text-[var(--contrast-color)]'
                                        : 'bg-[#F4F6FB] text-[#939598]'
                                "
                            >
                                <span>2</span>
                            </div>
                            <span
                                class="text-sm font-semibold leading-5 tracking-tight md:text-base"
                                :class="activeStep >= 2 ? 'text-[#313C52]' : 'text-[#939598]'"
                            >
                                Entrega
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <div class="hidden h-0.5 w-8 bg-[#DDDDDD] md:block"></div>
                        <div
                            class="flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold leading-5"
                            :class="
                                activeStep >= Number(stepPayment)
                                    ? 'bg-[var(--theme-color)] text-[var(--contrast-color)]'
                                    : 'bg-[#F4F6FB] text-[#939598]'
                            "
                        >
                            {{ stepPayment }}
                        </div>
                        <span
                            class="text-sm font-semibold leading-5 tracking-tight md:text-base"
                            :class="activeStep >= Number(stepPayment) ? 'text-[#313C52]' : 'text-[#939598]'"
                        >
                            Pagamento
                        </span>
                    </div>
                </div>

                <!-- Identificação -->
                <div class="flex flex-col gap-8 rounded-lg bg-white p-6">
                    <div class="flex flex-col gap-6">
                        <p class="text-base font-semibold leading-5 tracking-tight text-[#313C52]">Identificação</p>

                        <div class="w-full space-y-1.5">
                            <label class="text-sm font-medium text-[#313C52]">E-mail</label>
                            <div
                                class="flex h-[2.9375rem] w-full items-center gap-2 rounded-lg border border-[#DDDDDD] bg-white px-4 transition-colors focus-within:border-[var(--theme-color)]"
                            >
                                <input
                                    type="email"
                                    placeholder="seuemail@hotmail.com"
                                    class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                />
                            </div>
                        </div>

                        <div
                            v-if="resources?.fields?.email_confirmation"
                            class="w-full space-y-1.5"
                        >
                            <label class="text-sm font-medium text-[#313C52]">Confirme o e-mail</label>
                            <div
                                class="flex h-[2.9375rem] w-full items-center gap-2 rounded-lg border border-[#DDDDDD] bg-white px-4 transition-colors focus-within:border-[var(--theme-color)]"
                            >
                                <input
                                    type="email"
                                    placeholder="repita o e-mail"
                                    class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                />
                            </div>
                        </div>

                        <div class="flex flex-col items-start gap-6 md:flex-row">
                            <div class="w-full space-y-1.5">
                                <label class="text-sm font-medium text-[#313C52]">Telefone</label>
                                <div
                                    class="flex h-[2.9375rem] w-full items-center gap-2 rounded-lg border border-[#DDDDDD] bg-white px-4 transition-colors focus-within:border-[var(--theme-color)]"
                                >
                                    <input
                                        type="tel"
                                        placeholder="DDD + número"
                                        class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                    />
                                </div>
                            </div>
                            <div class="w-full space-y-1.5">
                                <label class="text-sm font-medium text-[#313C52]">
                                    {{ resources?.fields?.document_type === 'cnpj' ? 'CNPJ' : 'CPF' }}
                                </label>
                                <div
                                    class="flex h-[2.9375rem] w-full items-center gap-2 rounded-lg border border-[#DDDDDD] bg-white px-4 transition-colors focus-within:border-[var(--theme-color)]"
                                >
                                    <input
                                        type="text"
                                        placeholder="000.000.000-00"
                                        class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="w-full space-y-1.5">
                            <label class="text-sm font-medium text-[#313C52]">Nome completo</label>
                            <div
                                class="flex h-[2.9375rem] w-full items-center gap-2 rounded-lg border border-[#DDDDDD] bg-white px-4 transition-colors focus-within:border-[var(--theme-color)]"
                            >
                                <input
                                    type="text"
                                    placeholder="Nome e sobrenome"
                                    class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Entrega -->
                    <div v-if="requiresShipping" class="flex flex-col gap-6 border-t border-black/[0.06] pt-8">
                        <p class="text-base font-semibold leading-5 tracking-tight text-[#313C52]">Entrega</p>
                        <div class="flex flex-col items-start gap-6 md:flex-row">
                            <div class="w-full space-y-1.5 md:max-w-[12rem]">
                                <label class="text-sm font-medium text-[#313C52]">CEP</label>
                                <div
                                    class="flex h-[2.9375rem] w-full items-center rounded-lg border border-[#DDDDDD] bg-white px-4 focus-within:border-[var(--theme-color)]"
                                >
                                    <input
                                        placeholder="12345-000"
                                        class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                    />
                                </div>
                            </div>
                            <div class="w-full space-y-1.5">
                                <label class="text-sm font-medium text-[#313C52]">Endereço</label>
                                <div
                                    class="flex h-[2.9375rem] w-full items-center rounded-lg border border-[#DDDDDD] bg-white px-4 focus-within:border-[var(--theme-color)]"
                                >
                                    <input
                                        placeholder="Rua, Avenida, Alameda"
                                        class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col items-start gap-6 md:flex-row">
                            <div class="w-full space-y-1.5">
                                <label class="text-sm font-medium text-[#313C52]">Número</label>
                                <div
                                    class="flex h-[2.9375rem] w-full items-center rounded-lg border border-[#DDDDDD] bg-white px-4 focus-within:border-[var(--theme-color)]"
                                >
                                    <input
                                        placeholder="123"
                                        class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                    />
                                </div>
                            </div>
                            <div class="w-full space-y-1.5">
                                <label class="text-sm font-medium text-[#313C52]">Bairro</label>
                                <div
                                    class="flex h-[2.9375rem] w-full items-center rounded-lg border border-[#DDDDDD] bg-white px-4 focus-within:border-[var(--theme-color)]"
                                >
                                    <input
                                        placeholder="Bairro"
                                        class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                    />
                                </div>
                            </div>
                            <div class="w-full space-y-1.5">
                                <label class="text-sm font-medium text-[#313C52]">Complemento</label>
                                <div
                                    class="flex h-[2.9375rem] w-full items-center rounded-lg border border-[#DDDDDD] bg-white px-4 focus-within:border-[var(--theme-color)]"
                                >
                                    <input
                                        placeholder="Opcional"
                                        class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pagamento -->
                <div class="flex flex-col gap-6 rounded-lg bg-white p-6">
                    <p class="text-base font-semibold leading-5 tracking-tight text-[#313C52]">Pagamento</p>

                    <!-- Seletor de método -->
                    <div class="flex items-center gap-2.5">
                        <button
                            v-for="m in paymentMethods"
                            :key="m"
                            type="button"
                            class="flex flex-1 items-center justify-center gap-2 rounded border-2 px-2 py-3 text-sm font-semibold transition-colors"
                            :class="
                                method === m
                                    ? 'border-[var(--theme-color)] text-[#313C52]'
                                    : 'border-[#DDDDDD] text-[#939598]'
                            "
                            @click="method = m"
                        >
                            {{ methodLabels[m] }}
                            <span
                                v-if="resources?.discounts?.[m]"
                                class="rounded bg-[#59BF75]/10 px-1.5 py-0.5 text-xs font-bold text-[#59BF75]"
                            >
                                {{ resources.discounts[m] }}% OFF
                            </span>
                        </button>
                    </div>

                    <!-- Conteúdo por método -->
                    <div class="flex flex-col gap-2 rounded border border-[#DDDDDD] p-6">
                        <template v-if="method === 'card'">
                            <span class="text-sm font-semibold text-[#59BF75]">Aprovação imediata</span>
                            <div class="mt-4 space-y-4">
                                <div class="space-y-1.5">
                                    <label class="text-sm font-medium text-[#313C52]">Número do cartão</label>
                                    <div
                                        class="flex h-[2.9375rem] items-center rounded-lg border border-[#DDDDDD] px-4 focus-within:border-[var(--theme-color)]"
                                    >
                                        <input
                                            placeholder="4122 6777 5698 4588"
                                            class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                        />
                                    </div>
                                </div>
                                <div class="space-y-1.5">
                                    <label class="text-sm font-medium text-[#313C52]">Nome impresso no cartão</label>
                                    <div
                                        class="flex h-[2.9375rem] items-center rounded-lg border border-[#DDDDDD] px-4 focus-within:border-[var(--theme-color)]"
                                    >
                                        <input
                                            placeholder="GABRIEL M DOURADO"
                                            class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base uppercase text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                        />
                                    </div>
                                </div>
                                <div class="flex gap-4">
                                    <div class="w-full space-y-1.5">
                                        <label class="text-sm font-medium text-[#313C52]">Validade</label>
                                        <div
                                            class="flex h-[2.9375rem] items-center rounded-lg border border-[#DDDDDD] px-4 focus-within:border-[var(--theme-color)]"
                                        >
                                            <input
                                                placeholder="MM/AA"
                                                class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                    <div class="w-full space-y-1.5">
                                        <label class="text-sm font-medium text-[#313C52]">Cod. Segurança</label>
                                        <div
                                            class="flex h-[2.9375rem] items-center rounded-lg border border-[#DDDDDD] px-4 focus-within:border-[var(--theme-color)]"
                                        >
                                            <input
                                                placeholder="000"
                                                class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div class="space-y-1.5">
                                    <label class="text-sm font-medium text-[#313C52]">Parcelamento</label>
                                    <div
                                        class="flex h-[2.9375rem] items-center rounded-lg border border-[#DDDDDD] px-4"
                                    >
                                        <span class="text-base text-[#313C52]">
                                            1x de {{ currency(total) }} sem juros
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </template>

                        <template v-else-if="method === 'pix'">
                            <span class="text-sm font-semibold text-[#59BF75]">Aprovação imediata</span>
                            <p v-if="pixDiscount" class="mt-2 text-base font-bold text-[#313C52]">
                                Garanta <span class="text-[#59BF75]">{{ pixDiscount }}%</span> de desconto pagando via Pix
                            </p>
                            <p class="mt-2 text-sm leading-relaxed text-[#585858]">
                                Os pagamentos efetuados via Pix não podem ser parcelados. Seu produto será reservado e
                                enviado somente após a confirmação do pagamento.
                            </p>
                            <p class="mt-4 text-sm font-semibold text-[#313C52]">Lembre-se:</p>
                            <ul class="mt-1 list-inside list-disc space-y-1 text-sm leading-relaxed text-[#585858]">
                                <li>Ao gerar o código atente para a data de expiração;</li>
                                <li>O pagamento leva alguns minutos para ser processado;</li>
                            </ul>
                        </template>

                        <template v-else>
                            <p v-if="boletoDiscount" class="text-base font-bold text-[#313C52]">
                                Garanta <span class="text-[#59BF75]">{{ boletoDiscount }}%</span> de desconto pagando via
                                Boleto Bancário
                            </p>
                            <ul class="mt-2 list-inside list-disc text-sm leading-relaxed text-gray-600">
                                <li>Ao gerar o código atente para a data de expiração;</li>
                                <li>O pagamento leva alguns minutos para ser processado.</li>
                            </ul>
                        </template>
                    </div>

                    <!-- Order bumps -->
                    <!-- Order bump: cartão tracejado, preço riscado em vermelho
                         acima do preço da oferta em verde, botão em caixa alta e
                         a régua de escassez embaixo — receita literal do Vega. -->
                    <div v-if="orderBumps.length" class="mt-6 flex flex-col gap-4">
                        <span class="text-sm font-medium leading-4 text-[#373737]">
                            Temos
                            <span class="text-[#59BF75]">
                                {{ orderBumps.length }}
                                {{ orderBumps.length === 1 ? 'oferta disponível' : 'ofertas disponíveis' }}
                            </span>
                            para você:
                        </span>
                        <div
                            v-for="bump in orderBumps"
                            :key="bump.id"
                            class="relative flex min-w-0 flex-col gap-4 rounded border-2 border-dashed p-4"
                            :style="{
                                borderColor: resources?.order_bump?.border_color || '#59BF75',
                                backgroundColor: resources?.order_bump?.background_color || '#FFFFFF',
                            }"
                        >
                            <div class="flex min-w-0 items-start gap-4">
                                <figure v-if="bump.image" class="h-16 w-16 shrink-0 bg-white sm:h-20 sm:w-20">
                                    <img :src="bump.image" :alt="bump.name" class="h-full w-full rounded object-contain" />
                                </figure>
                                <div class="flex w-full min-w-0 flex-col gap-2">
                                    <p class="line-clamp-2 text-sm font-semibold leading-4 tracking-tighter text-[#313C52]">
                                        {{ bump.name }}
                                    </p>
                                    <div class="flex flex-col items-start leading-none">
                                        <p
                                            v-if="bump.original_price && bump.original_price > bump.price"
                                            class="text-[0.625rem] font-normal line-through text-[#E81414]"
                                        >
                                            {{ currency(bump.original_price) }}
                                        </p>
                                        <p class="text-lg font-bold leading-5 text-[#59BF75]">{{ currency(bump.price) }}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    class="flex w-full items-center justify-center gap-2 whitespace-nowrap rounded px-3 py-2 text-xs uppercase sm:w-auto sm:self-end sm:px-4 sm:py-3 sm:text-sm"
                                    :style="{
                                        backgroundColor: resources?.order_bump?.button_color || '#59BF75',
                                        color: '#FFFFFF',
                                    }"
                                >
                                    <span class="text-xs font-semibold leading-4 sm:text-sm">Pegar Oferta</span>
                                </button>
                            </div>
                            <span class="text-[0.625rem] font-medium leading-3 text-[#999999]">
                                Essa oferta <b>é exclusiva para esta compra</b> e não voltará!
                            </span>
                        </div>
                    </div>

                    <div class="flex w-full items-center justify-end">
                        <button
                            type="button"
                            class="flex items-center gap-4 rounded px-6 py-4 text-base font-semibold uppercase leading-5 transition-all hover:opacity-[.80]"
                            :style="{ backgroundColor: 'var(--payment-button-color)', color: '#FFFFFF' }"
                        >
                            {{ resources?.additional_information?.button_label || 'Finalizar compra' }}
                        </button>
                    </div>
                </div>

                <!-- Selo (mobile) -->
                <div class="flex w-full items-center justify-center lg:hidden">
                    <div class="flex items-center gap-2 rounded-[3.75rem] border border-gray-200 bg-white px-6 py-3 shadow-sm">
                        <svg class="fill-[var(--theme-color)]" width="20" height="20" viewBox="0 0 25 24">
                            <path
                                d="M21.46 4.8c-.04-.26-.22-.47-.48-.54L12.88 2.02a.75.75 0 0 0-.35 0L4.43 4.26c-.25.07-.44.28-.48.54-.05.33-1.12 8.25 1.63 12.19 2.75 3.94 6.8 4.95 6.97 4.99a.75.75 0 0 0 .31 0c.17-.04 4.22-1.05 6.97-4.99 2.75-3.94 1.68-11.86 1.63-12.19Z"
                            />
                        </svg>
                        <span class="text-xs font-semibold leading-3 text-[#313C52]">Ambiente seguro</span>
                    </div>
                </div>
            </div>

            <!-- Coluna do carrinho (desktop) -->
            <div class="hidden space-y-6 lg:block">
                <div class="sticky top-6 mx-auto space-y-6 rounded-lg">
                    <div class="flex w-[21.75rem] flex-col gap-4 rounded-lg bg-white">
                        <div class="flex w-full items-center justify-between gap-4 px-6 pt-6">
                            <span class="text-base font-semibold leading-5 tracking-tight text-[#313C52]">
                                Seu carrinho
                            </span>
                            <div
                                class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--theme-color)] text-sm font-extrabold leading-3 text-[var(--contrast-color)]"
                            >
                                {{ itemCount }}
                            </div>
                        </div>

                        <div class="max-h-72 w-full space-y-4 overflow-y-auto px-6">
                            <div v-for="item in items" :key="item.id" class="flex items-start justify-between gap-3">
                                <div class="flex items-start gap-3">
                                    <img
                                        v-if="item.image"
                                        :src="item.image"
                                        alt=""
                                        class="h-12 w-12 shrink-0 rounded object-cover"
                                    />
                                    <div>
                                        <p class="text-sm font-semibold leading-5 text-[#313C52]">{{ item.name }}</p>
                                        <p class="text-xs text-gray-600">{{ item.qty || 1 }} un.</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-semibold text-[#313C52]">{{ currency(item.price) }}</span>
                                    <button
                                        v-if="resources?.cart?.allow_remove"
                                        type="button"
                                        class="flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10"
                                    >
                                        <X class="h-3 w-3 text-[#939598]" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="mx-auto h-0.5 w-11/12 rounded bg-[#EBEBEB]"></div>

                        <div class="space-y-2 px-6">
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">Subtotal</span>
                                <span class="text-sm font-semibold text-[#313C52]">{{ currency(subtotal) }}</span>
                            </div>

                            <!-- Frete: só existe com produto físico, e frete zero
                                 vira selo, não "R$ 0,00" — é o que a referência faz. -->
                            <div v-if="requiresShipping" class="flex items-center justify-between">
                                <span class="text-sm text-gray-600">Frete</span>
                                <span
                                    v-if="!shipping"
                                    class="rounded bg-emerald-400 px-2 py-1 text-xs font-black uppercase leading-4 text-white"
                                >
                                    Grátis
                                </span>
                                <span v-else class="text-sm font-semibold text-[#313C52]">{{ currency(shipping) }}</span>
                            </div>

                            <div v-if="resources?.coupon?.enabled">
                                <button
                                    v-if="!couponOpen"
                                    type="button"
                                    class="text-sm font-medium text-[var(--theme-color)]"
                                    @click="couponOpen = true"
                                >
                                    Adicionar cupom
                                </button>
                                <div
                                    v-else
                                    class="mt-1 flex h-[2.9375rem] w-full items-center gap-2 rounded-lg border border-[#DDDDDD] bg-white px-4 transition-colors focus-within:border-[var(--theme-color)]"
                                >
                                    <input
                                        type="text"
                                        placeholder="Adicionar cupom"
                                        class="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-[#313C52] outline-none placeholder:text-[#999999] focus:ring-0"
                                    />
                                    <span class="shrink-0 text-sm font-medium text-[var(--theme-color)]">Aplicar</span>
                                </div>
                            </div>
                        </div>

                        <div class="mx-auto h-0.5 w-11/12 rounded bg-[#EBEBEB]"></div>

                        <div class="flex items-center justify-between px-6 pb-6">
                            <span class="text-sm font-normal text-[#373737]">Total</span>
                            <span class="text-base font-semibold leading-5 tracking-tight text-[#59BF75]">
                                {{ currency(total) }}
                            </span>
                        </div>
                    </div>

                    <!-- Prova social: depoimentos em imagem, em carrossel ou
                         empilhados. Fica entre o carrinho e o selo, como na
                         referência, limitado à largura da coluna. -->
                    <div v-if="socialProofImages.length" class="w-full max-w-[21.75rem]">
                        <p v-if="socialProof.title" class="mb-4 text-base font-black text-[#313C52]">
                            {{ socialProof.title }}
                        </p>

                        <div v-if="socialProof.layout === 'piled_up'" class="flex flex-col gap-4">
                            <img
                                v-for="(img, i) in socialProofImages"
                                :key="i"
                                :src="img"
                                alt="Depoimento"
                                class="block h-auto w-full rounded-lg"
                            />
                        </div>

                        <div v-else class="flex items-center gap-3">
                            <button
                                type="button"
                                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#313C52] hover:bg-black/5"
                                aria-label="Depoimento anterior"
                                @click="socialProofPrev"
                            >
                                <ChevronLeft class="h-4 w-4" />
                            </button>
                            <div class="min-w-0 flex-1 overflow-hidden rounded-lg">
                                <img
                                    :src="socialProofImages[socialProofIndex]"
                                    :alt="`Depoimento ${socialProofIndex + 1}`"
                                    class="block h-auto w-full rounded-lg"
                                />
                            </div>
                            <button
                                type="button"
                                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#313C52] hover:bg-black/5"
                                aria-label="Próximo depoimento"
                                @click="socialProofNext"
                            >
                                <ChevronRight class="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div class="flex w-full items-center justify-center">
                        <div
                            class="flex items-center gap-2 rounded-[3.75rem] border border-gray-200 bg-white px-6 py-3 shadow-sm"
                        >
                            <svg class="fill-[var(--theme-color)]" width="20" height="20" viewBox="0 0 25 24">
                                <path
                                    d="M21.46 4.8c-.04-.26-.22-.47-.48-.54L12.88 2.02a.75.75 0 0 0-.35 0L4.43 4.26c-.25.07-.44.28-.48.54-.05.33-1.12 8.25 1.63 12.19 2.75 3.94 6.8 4.95 6.97 4.99a.75.75 0 0 0 .31 0c.17-.04 4.22-1.05 6.97-4.99 2.75-3.94 1.68-11.86 1.63-12.19Z"
                                />
                            </svg>
                            <span class="text-xs font-semibold leading-3 text-[#313C52]">Ambiente seguro</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Rodapé -->
        <footer class="mx-auto mt-6 w-11/12 max-w-[60rem] rounded-lg bg-white py-6 text-center">
            <p class="mb-4 text-sm text-gray-600">Formas de pagamento</p>
            <div class="mb-6 flex items-center justify-center gap-4 text-[#313C52]">
                <span
                    v-for="m in paymentMethods"
                    :key="m"
                    class="rounded border border-[#DDDDDD] px-3 py-1 text-xs font-semibold uppercase text-[#939598]"
                >
                    {{ methodLabels[m] }}
                </span>
            </div>
            <p class="text-sm text-gray-600">© {{ new Date().getFullYear() }} <span>{{ store.name }}</span></p>
        </footer>
    </div>
</template>
