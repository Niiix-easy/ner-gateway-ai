<script setup>
/**
 * Bancada de aprovação do layout Clássico (F1).
 *
 * Rota interna, fora do fluxo de venda: renderiza o ClassicLayout com dados de
 * demonstração e um painel de controles no design system do painel, para
 * validar o visual antes de plugar o motor de pagamento real.
 */
import { reactive, computed, ref } from 'vue';
import { Head } from '@inertiajs/vue3';
import { Monitor, Smartphone } from 'lucide-vue-next';
import ClassicLayout from '@/components/checkout/layouts/ClassicLayout.vue';

defineOptions({ layout: null });

const viewport = ref('desktop');

const store = { name: 'Plataforma Store' };

const items = [
    { id: 1, name: 'Planilha Financeira', qty: 1, price: 19.9, image: null },
];

const orderBumps = [
    { id: 1, name: 'Acabe com as dívidas em 90 dias', original_price: 27.9, price: 7.9, image: null },
    { id: 2, name: '20 maneiras de fazer R$1000 em 7 dias', original_price: 29.9, price: 9.9, image: null },
];

const config = reactive({
    visual: {
        logo_url: '/images/logo.png',
        logo_align: 'left',
        hide_store_name: false,
        banners: [],
        theme: {
            theme_color: '#2135FA',
            contrast_color: '#FFFFFF',
            secondary_color: '#F4F6FB',
            payment_button_color: '#59BF75',
            background_color: '#F4F6FB',
            border_radius: '0.5rem',
        },
    },
    resources: {
        timer: { enabled: true, position: 'top', message: 'Oferta termina em' },
        marquee: { enabled: false, mode: 'scroll', text: 'Frete grátis acima de R$ 99' },
        coupon: { enabled: true },
        cart: { start_open: false, toggle_label: 'ver carrinho', allow_remove: true },
        fields: { email_confirmation: false, document_type: 'cpf' },
        discounts: { pix: 5 },
        order_bump: { background_color: '#FFFFFF', border_color: '#59BF75', button_color: '#59BF75' },
        additional_information: { button_label: 'Finalizar compra' },
        invert_columns: false,
    },
    post_cart: {
        social_proof: {
            title: 'Quem já comprou',
            layout: 'carousel',
            images: [],
        },
    },
});

const requiresShipping = ref(false);
const shipping = ref(0);
const methods = ref(['card', 'pix', 'boleto']);

const frameClass = computed(() =>
    viewport.value === 'mobile' ? 'w-[420px] max-w-full' : 'w-full'
);

const controls = [
    { label: 'Temporizador', get: () => config.resources.timer.enabled, set: (v) => (config.resources.timer.enabled = v) },
    { label: 'Letreiro', get: () => config.resources.marquee.enabled, set: (v) => (config.resources.marquee.enabled = v) },
    { label: 'Cupom', get: () => config.resources.coupon.enabled, set: (v) => (config.resources.coupon.enabled = v) },
    { label: 'Remover itens', get: () => config.resources.cart.allow_remove, set: (v) => (config.resources.cart.allow_remove = v) },
    { label: 'Inverter colunas', get: () => config.resources.invert_columns, set: (v) => (config.resources.invert_columns = v) },
    { label: 'Produto físico (frete)', get: () => requiresShipping.value, set: (v) => (requiresShipping.value = v) },
    {
        label: 'Prova social',
        get: () => config.post_cart.social_proof.images.length > 0,
        /* Sem imagem real na bancada, o placeholder mostra a caixa no lugar certo. */
        set: (v) => {
            config.post_cart.social_proof.images = v
                ? [
                      'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" rx="8" fill="%23E9EDF7"/><text x="160" y="96" font-family="sans-serif" font-size="14" fill="%23939598" text-anchor="middle">Depoimento 1</text></svg>'),
                      'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" rx="8" fill="%23E9EDF7"/><text x="160" y="96" font-family="sans-serif" font-size="14" fill="%23939598" text-anchor="middle">Depoimento 2</text></svg>'),
                  ]
                : [];
        },
    },
    { label: 'Confirmar e-mail', get: () => config.resources.fields.email_confirmation, set: (v) => (config.resources.fields.email_confirmation = v) },
    { label: 'Produto físico (entrega)', get: () => requiresShipping.value, set: (v) => (requiresShipping.value = v) },
];
</script>

<template>
    <Head title="Preview — layout Clássico" />

    <div class="flex min-h-screen bg-zinc-100 dark:bg-[#050607]">
        <!-- Controles -->
        <aside
            class="hidden w-72 shrink-0 flex-col gap-6 border-r border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 lg:flex"
        >
            <div>
                <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Layout Clássico</p>
                <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Bancada de aprovação. Sem gateway conectado — os campos aqui não processam pagamento.
                </p>
            </div>

            <div class="flex gap-2">
                <button
                    v-for="v in [['desktop', Monitor], ['mobile', Smartphone]]"
                    :key="v[0]"
                    type="button"
                    class="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
                    :class="
                        viewport === v[0]
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    "
                    @click="viewport = v[0]"
                >
                    <component :is="v[1]" class="h-4 w-4" />
                    {{ v[0] === 'desktop' ? 'Desktop' : 'Mobile' }}
                </button>
            </div>

            <div class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Recursos</p>
                <label
                    v-for="c in controls"
                    :key="c.label"
                    class="flex cursor-pointer items-center justify-between text-sm text-zinc-700 dark:text-zinc-300"
                >
                    {{ c.label }}
                    <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-zinc-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        :checked="c.get()"
                        @change="c.set($event.target.checked)"
                    />
                </label>
            </div>

            <div class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Cores</p>
                <label
                    v-for="key in ['theme_color', 'payment_button_color', 'background_color', 'secondary_color']"
                    :key="key"
                    class="flex items-center justify-between text-sm text-zinc-700 dark:text-zinc-300"
                >
                    <span class="capitalize">{{ key.replace(/_/g, ' ') }}</span>
                    <input
                        type="color"
                        class="h-7 w-12 cursor-pointer rounded border border-zinc-200 bg-transparent dark:border-zinc-700"
                        :value="config.visual.theme[key]"
                        @input="config.visual.theme[key] = $event.target.value"
                    />
                </label>
            </div>

            <div class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Métodos</p>
                <label
                    v-for="m in ['card', 'pix', 'boleto']"
                    :key="m"
                    class="flex cursor-pointer items-center justify-between text-sm capitalize text-zinc-700 dark:text-zinc-300"
                >
                    {{ m }}
                    <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-zinc-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        :checked="methods.includes(m)"
                        @change="
                            $event.target.checked
                                ? methods.push(m)
                                : (methods = methods.filter((x) => x !== m))
                        "
                    />
                </label>
            </div>
        </aside>

        <!-- Preview -->
        <main class="flex-1 overflow-auto p-6">
            <div class="mx-auto transition-all" :class="frameClass">
                <div class="overflow-hidden rounded-xl border border-zinc-200 shadow-sm dark:border-zinc-800">
                    <ClassicLayout
                        :config="config"
                        :store="store"
                        :items="items"
                        :order-bumps="orderBumps"
                        :payment-methods="methods"
                        :requires-shipping="requiresShipping"
                        :shipping="shipping"
                    />
                </div>
            </div>
        </main>
    </div>
</template>
