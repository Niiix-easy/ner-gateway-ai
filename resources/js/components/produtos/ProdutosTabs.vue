<script setup>
/**
 * Abas de Produtos no design system Andes (48px, sublinhado azul de 3px).
 * Carrega o próprio escopo .andes-dash para valer também nas telas irmãs que
 * ainda não foram migradas.
 */
import { computed } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import { useI18n } from '@/composables/useI18n';

const page = usePage();
const { t } = useI18n();

const path = computed(() => page.url.split('?')[0]);

const isCoproducao = computed(() => path.value === '/produtos/coproducao');

const isAfiliados = computed(() => path.value === '/produtos/afiliados' || /^\/produtos\/[^/]+\/painel-afiliado/.test(path.value));

/**
 * Telas que moram sob /produtos mas são itens próprios do menu lateral — não
 * pertencem a estas abas e não podem acender a aba "Produtos".
 */
const FORA_DAS_ABAS = ['/produtos/cupons', '/produtos/alunos', '/produtos/vitrine-afiliacao'];

const pertenceAsAbas = computed(() => !FORA_DAS_ABAS.some((rota) => path.value.startsWith(rota)));

const isProdutos = computed(() => {
    const p = path.value;
    if (
        !pertenceAsAbas.value ||
        p === '/produtos/coproducao' ||
        p === '/produtos/afiliados' ||
        /^\/produtos\/[^/]+\/painel-afiliado/.test(p)
    ) {
        return false;
    }
    return p === '/produtos' || /^\/produtos\/[^/]+/.test(p);
});
</script>

<template>
    <div v-if="pertenceAsAbas" class="andes-dash andes-scope--bare">
        <div class="andes-ui-tabs" style="margin-bottom: 24px">
            <div class="andes-ui-tabs__tablist" role="tablist" :aria-label="t('sidebar.products', 'Produtos')">
                <Link
                    href="/produtos"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': isProdutos }"
                    :aria-current="isProdutos ? 'page' : undefined"
                >
                    <AndesIcon name="archive" />
                    {{ t('products.tab_products', 'Produtos') }}
                </Link>
                <Link
                    href="/produtos/coproducao"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': isCoproducao }"
                    :aria-current="isCoproducao ? 'page' : undefined"
                >
                    <AndesIcon name="hand-shake" />
                    {{ t('products.tab_coproduction', 'Co-produção') }}
                </Link>
                <Link
                    v-if="page.props.features?.vitrine_afiliados"
                    href="/produtos/afiliados"
                    class="andes-ui-tab"
                    :class="{ 'andes-ui-tab--selected': isAfiliados }"
                    :aria-current="isAfiliados ? 'page' : undefined"
                >
                    <AndesIcon name="user" />
                    {{ t('products.tab_affiliates', 'Afiliados') }}
                </Link>
            </div>
        </div>
    </div>
</template>
