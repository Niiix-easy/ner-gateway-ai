import { computed } from 'vue';

/**
 * Template do painel do vendedor — fixo em Aurora.
 */
export function useSellerDashboardTemplate() {
    const templateId = computed(() => 'aurora');
    const isAurora = computed(() => true);
    const isKawaii = computed(() => false);
    const isDefault = computed(() => false);
    const isThemedShell = computed(() => true);
    const themePrefix = computed(() => 'aurora');
    const pageWrapperClass = computed(() => 'aurora-page');

    return {
        templateId,
        isDefault,
        isAurora,
        isKawaii,
        isThemedShell,
        themePrefix,
        pageWrapperClass,
    };
}
