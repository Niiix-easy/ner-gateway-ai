<script setup>
/**
 * Abas de Vendas no design system Andes (48px, sublinhado azul de 3px).
 * Carrega o próprio escopo .andes-dash para valer também nas telas irmãs que
 * ainda não foram migradas.
 */
import { computed } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import { useI18n } from '@/composables/useI18n';

const page = usePage();
const { t } = useI18n();

const medOpenCount = computed(() => Number(page.props.med_open_count ?? 0));

const isVendas = computed(() => {
    const url = page.url.split('?')[0];
    return url === '/vendas' || (
        url.startsWith('/vendas')
        && !url.startsWith('/vendas/assinaturas')
        && !url.startsWith('/vendas/disputas')
        && !url.startsWith('/vendas/reembolsos')
    );
});

const isAssinaturas = computed(() => page.url.split('?')[0].startsWith('/vendas/assinaturas'));

const isDisputas = computed(() => page.url.split('?')[0].startsWith('/vendas/disputas'));

const isReembolsos = computed(() => page.url.split('?')[0].startsWith('/vendas/reembolsos'));
</script>

<template>
    <div class="andes-dash andes-scope--bare">
        <div class="andes-ui-tabs" style="margin-bottom: 24px">
            <div class="andes-ui-tabs__tablist" role="tablist" :aria-label="t('sidebar.sales', 'Vendas')">
                <Link
                    href="/vendas"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': isVendas }"
                    :aria-current="isVendas ? 'page' : undefined"
                >
                    <AndesIcon name="hand-money" />
                    {{ t('sales.tab_sales', 'Vendas') }}
                </Link>
                <Link
                    v-if="page.props.features?.infoprodutos"
                    href="/vendas/assinaturas"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': isAssinaturas }"
                    :aria-current="isAssinaturas ? 'page' : undefined"
                >
                    <AndesIcon name="refresh" />
                    {{ t('sales.tab_subscriptions', 'Assinaturas') }}
                </Link>
                <Link
                    href="/vendas/disputas"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': isDisputas }"
                    :aria-current="isDisputas ? 'page' : undefined"
                >
                    <AndesIcon name="shield" />
                    Disputas MED
                    <span v-if="medOpenCount > 0" class="andes-ui-badge andes-ui-badge--medium andes-ui-badge--caution">
                        <span class="andes-ui-badge__content">{{ medOpenCount > 99 ? '99+' : medOpenCount }}</span>
                    </span>
                </Link>
                <Link
                    href="/vendas/reembolsos"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': isReembolsos }"
                    :aria-current="isReembolsos ? 'page' : undefined"
                >
                    <AndesIcon name="import" />
                    Reembolsos
                </Link>
            </div>
        </div>
    </div>
</template>
