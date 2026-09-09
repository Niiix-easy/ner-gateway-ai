import { computed } from 'vue';

/**
 * Template de login/cadastro — fixo em Imersivo.
 */
export function useLoginTemplate() {
    const templateId = computed(() => 'immersive');
    const isDefault = computed(() => false);
    const isSpotlight = computed(() => false);
    const isImmersive = computed(() => true);
    const isModernLogin = computed(() => true);

    return {
        templateId,
        isDefault,
        isSpotlight,
        isImmersive,
        isModernLogin,
    };
}
