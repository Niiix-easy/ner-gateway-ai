<script setup>
/**
 * Campo de formulário das telas de autenticação no Andes:
 * rótulo (12/16, peso 600, texto secundário) + input de 48px com raio 12.
 */
defineProps({
    id: { type: String, required: true },
    label: { type: String, default: '' },
    modelValue: { type: String, default: '' },
    type: { type: String, default: 'text' },
    autocomplete: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    inputmode: { type: String, default: undefined },
    maxlength: { type: [String, Number], default: undefined },
    inputClass: { type: String, default: '' },
    required: { type: Boolean, default: false },
    error: { type: String, default: '' },
});

defineEmits(['update:modelValue']);
</script>

<template>
    <div class="andes-ui-form-control">
        <label class="andes-ui-form-control__label" :for="id">{{ label }}</label>

        <div class="andes-auth__field">
            <input
                :id="id"
                class="andes-ui-input"
                :class="[inputClass, { 'andes-ui-input--error': Boolean(error) }]"
                :type="type"
                :value="modelValue"
                :autocomplete="autocomplete || undefined"
                :placeholder="placeholder || undefined"
                :inputmode="inputmode"
                :maxlength="maxlength"
                :required="required"
                :aria-invalid="error ? 'true' : undefined"
                @input="$emit('update:modelValue', $event.target.value)"
            />
            <slot name="trailing" />
        </div>

        <p v-if="error" class="andes-error">{{ error }}</p>
    </div>
</template>
