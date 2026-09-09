<script setup>
/**
 * Valor monetário no componente do design system Andes.
 *
 * Regras do guia:
 * - peso 600, sempre com símbolo em elemento próprio;
 * - centavos sobrescritos em destaques (`cents="sups"`), vírgula normal em
 *   listas e tabelas (`cents="comma"`);
 * - sigilo (olho fechado) vira "R$ ••••";
 * - saída de dinheiro usa cor primária com sinal −, nunca vermelho.
 */
import { computed } from 'vue';

const props = defineProps({
    value: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
    size: { type: String, default: 'medium' },
    cents: { type: String, default: 'sups' },
    tone: { type: String, default: '' },
});

const parts = computed(() => {
    const formatted = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(props.value));
    const [integer, decimals] = formatted.split(',');

    return {
        negative: props.value < 0,
        integer,
        decimals,
    };
});
</script>

<template>
    <span
        class="andes-ui-money-amount"
        :class="[`andes-ui-money-amount--${size}`, tone ? `andes-ui-money-amount--${tone}` : '']"
    >
        <template v-if="visible">
            <template v-if="parts.negative">−</template>
            <span class="andes-ui-money-amount__currency-symbol">R$</span>
            <template v-if="cents === 'sups'">
                {{ parts.integer }}<span class="sr-only">,</span><span class="andes-ui-money-amount__cents-sups">{{ parts.decimals }}</span>
            </template>
            <template v-else>{{ parts.integer }},{{ parts.decimals }}</template>
        </template>
        <template v-else>
            <span class="andes-ui-money-amount__currency-symbol">R$</span>••••
        </template>
    </span>
</template>
