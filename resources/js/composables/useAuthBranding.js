import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';

/**
 * Cor de conteúdo legível sobre a cor da marca — o guia manda o par loud ser
 * fundo saturado com conteúdo de alto contraste, e a marca é configurável.
 */
function readableOn(color) {
    const hex = String(color ?? '').trim().replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const int = Number.parseInt(full.slice(0, 6), 16);
    if (full.length < 6 || Number.isNaN(int)) {
        return '#ffffff';
    }
    const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];

    return luminance > 0.45 ? '#18181b' : '#ffffff';
}

export function useAuthBranding() {
    const page = usePage();
    const branding = computed(() => page.props.public_branding ?? {});
    const primary = computed(() => branding.value.theme_primary || '#2135fa');
    const appName = computed(() => branding.value.app_name || 'Plataforma');
    const logoLight = computed(() => branding.value.app_logo || branding.value.app_logo_icon || '/images/logo.png');
    const logoDark = computed(() => branding.value.app_logo_dark || branding.value.app_logo_icon_dark || logoLight.value || '/images/logo-dark.png');
    const onPrimary = computed(() => readableOn(primary.value));
    const logoIcon = computed(() => branding.value.app_logo_icon || '/images/favicon.png');
    const heroImage = computed(() => branding.value.login_hero_image || '/images/login.png');
    const heroTagline = computed(() => branding.value.login_hero_tagline || 'Sua plataforma para vender mais.');
    const heroSubtagline = computed(() => branding.value.login_hero_subtagline || 'Feita para quem escala de verdade.');

    return {
        branding,
        primary,
        onPrimary,
        appName,
        logoLight,
        logoDark,
        logoIcon,
        heroImage,
        heroTagline,
        heroSubtagline,
    };
}
