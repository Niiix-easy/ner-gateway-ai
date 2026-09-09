<script setup>
/**
 * Casca das telas de autenticação no Andes (restyling da área logada).
 *
 * Composição tirada do guia: cabeçalho de 72px com a marca no quadrado de 48
 * (raio 12), coluna de conteúdo de no máximo 1044px e, no lugar da navegação,
 * a faixa `.andes-banner` — a receita literal de `.reporting-banner`, que o
 * guia manda usar em cinza com gradiente escuro, nunca na cor da marca. O
 * formulário fica no cartão de raio 20 com borda de 1px e sem sombra.
 */
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { useAuthBranding } from '@/composables/useAuthBranding';
import { useAuthTheme } from '@/composables/useAuthTheme';
import CookieConsentBanner from '@/components/legal/CookieConsentBanner.vue';

const props = defineProps({
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    /** Faixa: cai no tagline do white label quando não vem nada */
    bannerTitle: { type: String, default: '' },
    bannerText: { type: String, default: '' },
    /** Fatos da faixa: [{ value, label }] — o par b + span do componente */
    facts: {
        type: Array,
        default: () => [
            { value: 'Vendas', label: 'pedidos, assinaturas e reembolsos' },
            { value: 'Produtos', label: 'ofertas, cupons e alunos' },
            { value: 'Financeiro', label: 'saldo, saques e relatórios' },
        ],
    },
    /** Tema fixo (ex.: /criar-admin roda sempre claro) */
    forceLight: { type: Boolean, default: false },
});

const { appName, logoIcon, heroTagline, heroSubtagline } = useAuthBranding();
useAuthTheme(props.forceLight ? { force: 'light' } : {});

const bannerHeading = computed(() => props.bannerTitle || heroTagline.value);
const bannerSupport = computed(() => props.bannerText || heroSubtagline.value);
const year = new Date().getFullYear();
</script>

<template>
    <div class="andes-dash andes-auth">
        <header class="andes-auth__topbar">
            <Link class="andes-auth__brand" href="/login">
                <span class="andes-auth__mark">
                    <img :src="logoIcon" :alt="appName" />
                </span>
                <b class="andes-ui-typography tp-heading-small">{{ appName }}</b>
            </Link>

            <div v-if="$slots['topbar-end']" class="andes-auth__topbar-end">
                <slot name="topbar-end" />
            </div>
        </header>

        <main class="andes-auth__main">
            <section class="andes-banner andes-auth__banner">
                <div class="andes-banner__content">
                    <div class="andes-banner__text">
                        <p class="andes-banner__title">{{ bannerHeading }}</p>
                        <p v-if="bannerSupport" class="andes-banner__subtitle">{{ bannerSupport }}</p>
                    </div>

                    <div v-if="facts.length" class="andes-banner__facts">
                        <div v-for="fact in facts" :key="fact.value" class="andes-banner__fact">
                            <b>{{ fact.value }}</b>
                            <span>{{ fact.label }}</span>
                        </div>
                    </div>
                </div>
            </section>

            <div class="andes-auth__panel">
                <div class="andes-ui-card andes-ui-card--padding-huge">
                    <div v-if="title || subtitle" class="andes-dash__head">
                        <h1 v-if="title" class="andes-ui-typography tp-heading-huge">{{ title }}</h1>
                        <p v-if="subtitle" class="andes-ui-typography tp-body-medium">{{ subtitle }}</p>
                    </div>

                    <slot />
                </div>

                <div class="andes-auth__foot">
                    <slot name="footer" />
                    <p class="andes-auth__copy">© {{ year }} {{ appName }}</p>
                </div>
            </div>
        </main>

        <CookieConsentBanner />
    </div>
</template>
