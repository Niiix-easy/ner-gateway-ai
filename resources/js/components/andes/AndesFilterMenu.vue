<script setup>
/**
 * Filtro em botão + menu, no padrão da faixa de filtros da tela "3 · Relatórios"
 * do guia: botão pequeno, `quiet` quando o filtro está aplicado e `mute` quando
 * não está, com o valor escolhido no próprio rótulo.
 *
 * Serve tanto para escolha única (options + modelValue) quanto para conteúdo
 * livre no slot (lista de caixas de seleção, por exemplo).
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';

const props = defineProps({
    label: { type: String, required: true },
    icon: { type: String, default: '' },
    /** Escolha única: [{ value, label }] */
    options: { type: Array, default: () => [] },
    modelValue: { type: [String, Number], default: '' },
    /** Valor que significa "sem filtro" — mantém o botão em mute */
    neutralValue: { type: [String, Number], default: 'all' },
    /** Quantidade aplicada, para filtros de seleção múltipla no slot */
    count: { type: Number, default: 0 },
    /** Alinha o menu pela direita (usar no fim da barra) */
    alignEnd: { type: Boolean, default: false },
    width: { type: String, default: '240px' },
});

const emit = defineEmits(['update:modelValue', 'change']);

const open = ref(false);
const root = ref(null);

const isApplied = computed(() => {
    if (props.count > 0) return true;
    if (!props.options.length) return false;
    return props.modelValue !== props.neutralValue && props.modelValue !== '';
});

/* O botão mostra o que está valendo, não o nome genérico do campo. */
const buttonLabel = computed(() => {
    if (props.count > 0) return props.label;
    const found = props.options.find((o) => String(o.value) === String(props.modelValue));
    return isApplied.value && found ? found.label : props.label;
});

function choose(value) {
    emit('update:modelValue', value);
    emit('change', value);
    open.value = false;
}

function onDocumentClick(event) {
    if (!open.value) return;
    if (root.value && !root.value.contains(event.target)) {
        open.value = false;
    }
}

function onEscape(event) {
    if (event.key === 'Escape') open.value = false;
}

onMounted(() => {
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onEscape);
});

onUnmounted(() => {
    document.removeEventListener('click', onDocumentClick);
    document.removeEventListener('keydown', onEscape);
});

defineExpose({ close: () => { open.value = false; } });
</script>

<template>
    <div ref="root" class="andes-menu">
        <button
            type="button"
            class="andes-ui-button andes-ui-button--small"
            :class="isApplied ? 'andes-ui-button--quiet' : 'andes-ui-button--mute'"
            :aria-expanded="open ? 'true' : 'false'"
            :aria-label="label"
            @click.stop="open = !open"
        >
            <AndesIcon v-if="icon" :name="icon" />
            {{ buttonLabel }}
            <span v-if="count > 0" class="andes-ui-badge andes-ui-badge--medium andes-ui-badge--neutral-quiet">
                <span class="andes-ui-badge__content">{{ count }}</span>
            </span>
            <AndesIcon :name="open ? 'chevron-down' : 'chevron-right'" />
        </button>

        <div
            v-show="open"
            class="andes-menu__list"
            :style="{ width, left: alignEnd ? 'auto' : 0, right: alignEnd ? 0 : 'auto' }"
            role="menu"
            @click.stop
        >
            <slot :close="() => (open = false)">
                <button
                    v-for="opt in options"
                    :key="opt.value"
                    type="button"
                    class="andes-menu__item"
                    role="menuitemradio"
                    :aria-checked="String(opt.value) === String(modelValue) ? 'true' : 'false'"
                    @click="choose(opt.value)"
                >
                    <AndesIcon v-if="String(opt.value) === String(modelValue)" name="check" />
                    <span v-else class="andes-menu__spacer" aria-hidden="true" />
                    {{ opt.label }}
                </button>
            </slot>
        </div>
    </div>
</template>
