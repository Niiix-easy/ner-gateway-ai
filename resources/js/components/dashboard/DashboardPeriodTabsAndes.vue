<script setup>
/**
 * Abas de período no padrão Andes — o mesmo cabeçalho de abas do cartão de
 * saldo da Home do Mercado Pago. Troca o conteúdo do cartão sem recarregar.
 */
defineProps({
    period: { type: String, required: true },
    periodOptions: { type: Array, required: true },
    periodLabel: { type: String, default: 'Período' },
});

const emit = defineEmits(['update:period']);
</script>

<template>
    <div class="andes-ui-tabs">
        <div class="andes-ui-tabs__tablist" role="tablist" :aria-label="periodLabel">
            <button
                v-for="opt in periodOptions"
                :key="opt.value"
                type="button"
                role="tab"
                :aria-selected="period === opt.value ? 'true' : 'false'"
                class="andes-ui-tab"
                :class="{ 'andes-ui-tab--selected': period === opt.value }"
                @click="emit('update:period', opt.value)"
            >
                {{ opt.label }}
            </button>
        </div>
    </div>
</template>
