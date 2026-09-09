import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { useI18n } from '@/composables/useI18n';

/**
 * Ícones do menu: nomes do <AndesIcon>, desenhados pelas regras do guia
 * (kit Solar Linear + o conjunto redesenhado em
 * /root/design system guide). Um único mapa serve à barra lateral e aos
 * atalhos do dashboard, para os dois nunca divergirem.
 */
export const NAV_ICONS = {
    '/dashboard': 'home',
    '/vendas': 'hand-money',
    '/relatorios': 'chart-line',
    '/produtos': 'archive',
    '/pixgo': 'pix',
    '/produtos/vitrine-afiliacao': 'store',
    '/frete': 'bus',
    '/produtos/cupons': 'clipboard-check',
    '/produtos/alunos': 'documents',
    '/afiliados': 'hand-shake',
    '/integracoes': 'key',
    '/usuarios/equipe': 'user',
    '/aplicacoes-api': 'code-scan',
    '/financeiro': 'wallet',
    '/painel-cliente': 'archive',
};

/** Ícone declarado pelo plugin no servidor → nome equivalente no Andes. */
const iconMap = {
    Puzzle: 'sparkle',
    Plug: 'key',
    Wrench: 'settings',
    Settings: 'settings',
    FileCode: 'code-scan',
    Box: 'archive',
    LayoutDashboard: 'home',
    Package: 'archive',
    Users: 'user',
    BarChart3: 'chart-line',
    Mail: 'document-text',
    CodeXml: 'code-scan',
};

/** Hover only — evita rajadas de prefetch ao clicar e competir com a navegação real. */
export const panelNavPrefetch = 'hover';

export function useAppSidebarNav() {
    const page = usePage();
    const { t } = useI18n();

    const homeHref = computed(() => (page.props.customer_panel ? '/painel-cliente' : '/dashboard'));

    const appSettings = () => page.props.appSettings ?? {};
    const appName = () => appSettings().app_name || 'Infoprodutor';
    const hasLogoFull = () => !!(appSettings().app_logo || appSettings().app_logo_dark);
    const hasLogoIcon = () => !!(appSettings().app_logo_icon || appSettings().app_logo_icon_dark);

    const features = computed(() => page.props.features ?? {});
    const hasInfoprodutos = computed(() => !!features.value.infoprodutos);
    const hasVitrineAfiliados = computed(() => !!features.value.vitrine_afiliados);
    const hasEquipe = computed(() => !!features.value.equipe);
    const isDemoMode = computed(() => !!page.props.demo_mode?.enabled);

    /**
     * Build white label: todos os recursos vêm liberados, então não há badge de
     * "plugin" a exibir em nenhum modo.
     */
    function demoPluginBadge() {
        return undefined;
    }

    const pluginNavItems = computed(() => {
        const raw = page.props.pluginNavItems ?? [];
        return raw.map((item) => ({
            name: item.name,
            href: item.href,
            icon: iconMap[item.icon] ?? 'sparkle',
            pluginBadge: demoPluginBadge(
                `Plugin ${item.plugin_badge || item.pluginBadge || item.name}`
            ),
        }));
    });

    const perms = computed(() => page.props.auth?.permissions ?? {});
    const canView = (key) => {
        const role = page.props.auth?.user?.role;
        if (role === 'admin' || role === 'infoprodutor') return true;
        return !!perms.value?.[key];
    };

    const navItems = computed(() => {
        if (page.props.customer_panel) {
            return [{ name: 'Minhas compras', href: '/painel-cliente', icon: NAV_ICONS['/painel-cliente'] }];
        }

        const items = [];

        // Seção 1 — sempre
        if (canView('dashboard.view')) {
            items.push({ name: t('sidebar.dashboard', 'Dashboard'), href: '/dashboard', icon: NAV_ICONS['/dashboard'] });
        }

        if (canView('vendas.view')) {
            items.push({
                name: t('sidebar.sales', 'Vendas'),
                href: '/vendas',
                icon: NAV_ICONS['/vendas'],
            });
        }

        if (canView('relatorios.view')) {
            items.push({ name: t('sidebar.reports', 'Relatórios'), href: '/relatorios', icon: NAV_ICONS['/relatorios'] });
        }

        // Seção 2 — produtos / PixGO / vitrine (ordem da imagem)
        const section2 = [];

        if (hasInfoprodutos.value && canView('produtos.view')) {
            section2.push({
                name: t('sidebar.products', 'Produtos'),
                href: '/produtos',
                icon: NAV_ICONS['/produtos'],
                pluginBadge: demoPluginBadge('Plugin Infoprodutos'),
            });
        }

        if (page.props.pixgo_enabled_effective && canView('pixgo.view')) {
            section2.push({
                name: page.props.pixgo_sidebar_label || 'PixGO',
                href: '/pixgo',
                icon: NAV_ICONS['/pixgo'],
            });
        }

        if (hasVitrineAfiliados.value && canView('produtos.view')) {
            section2.push({
                name: t('sidebar.affiliate_showcase', 'Vitrine'),
                href: '/produtos/vitrine-afiliacao',
                icon: NAV_ICONS['/produtos/vitrine-afiliacao'],
                pluginBadge: demoPluginBadge('Plugin Vitrine afiliados'),
            });
        }

        if (hasInfoprodutos.value && canView('produtos.view') && page.props.physical_products_enabled_effective) {
            section2.push({
                name: t('sidebar.shipping', 'Taxas e frete'),
                href: '/frete',
                icon: NAV_ICONS['/frete'],
                pluginBadge: demoPluginBadge('Plugin Infoprodutos'),
            });
        }

        if (hasInfoprodutos.value && canView('produtos.view')) {
            section2.push({
                name: t('sidebar.coupons', 'Cupons'),
                href: '/produtos/cupons',
                icon: NAV_ICONS['/produtos/cupons'],
                pluginBadge: demoPluginBadge('Plugin Infoprodutos'),
            });
            section2.push({
                name: t('sidebar.students', 'Alunos'),
                href: '/produtos/alunos',
                icon: NAV_ICONS['/produtos/alunos'],
                pluginBadge: demoPluginBadge('Plugin Infoprodutos'),
            });
        }

        if (hasVitrineAfiliados.value && canView('produtos.view')) {
            section2.push({
                name: t('sidebar.affiliates_menu', 'Afiliados'),
                href: '/afiliados',
                icon: NAV_ICONS['/afiliados'],
                pluginBadge: demoPluginBadge('Plugin Vitrine afiliados'),
            });
        }

        if (section2.length) {
            items.push({ separator: true, label: t('sidebar.section_catalog', 'Catálogo') });
            items.push(...section2);
        }

        // Seção 3 — integrações / equipe / API / financeiro
        const section3 = [];

        if (hasInfoprodutos.value && canView('integracoes.view')) {
            section3.push({
                name: t('sidebar.integrations', 'Integrações'),
                href: '/integracoes',
                icon: NAV_ICONS['/integracoes'],
                pluginBadge: demoPluginBadge('Plugin Infoprodutos'),
            });
        }

        if ((page.props.auth?.user?.role === 'admin' || page.props.auth?.user?.role === 'infoprodutor') && pluginNavItems.value.length) {
            section3.push(...pluginNavItems.value);
        }

        if (hasEquipe.value && (page.props.auth?.user?.role === 'infoprodutor' || canView('equipe.manage'))) {
            section3.push({
                name: t('sidebar.team', 'Equipe'),
                href: '/usuarios/equipe',
                icon: NAV_ICONS['/usuarios/equipe'],
                pluginBadge: demoPluginBadge('Plugin Equipe'),
            });
        }

        // API PIX liberada para os sellers desta build white label: a área fica
        // visível no menu para quem tem a permissão de API de pagamentos.
        if (canView('api_pagamentos.view')) {
            section3.push({
                name: t('sidebar.api_pix', 'API PIX'),
                href: '/aplicacoes-api',
                icon: NAV_ICONS['/aplicacoes-api'],
            });
        }

        if (canView('financeiro.view')) {
            section3.push({ name: t('sidebar.finance', 'Financeiro'), href: '/financeiro', icon: NAV_ICONS['/financeiro'] });
        }

        if (section3.length) {
            items.push({ separator: true, label: t('sidebar.section_operation', 'Operação') });
            items.push(...section3);
        }

        if (!page.props.customer_panel) {
            items.push({ separator: true });
            items.push({ pwaInstall: true });
        }

        return items;
    });

    function isActive(href) {
        const url = page.url.split('?')[0];
        if (href === '/frete') return url === '/frete' || url.startsWith('/frete/');
        if (href === '/dashboard') return url === '/dashboard' || url === '/';
        if (href === '/vendas') {
            return url === '/vendas' || url.startsWith('/vendas/');
        }
        if (href === '/produtos/vitrine-afiliacao') {
            return url === '/produtos/vitrine-afiliacao' || url.startsWith('/produtos/vitrine-afiliacao/');
        }
        if (href === '/produtos/cupons') {
            return url.startsWith('/produtos/cupons');
        }
        if (href === '/produtos/alunos') {
            return url.startsWith('/produtos/alunos');
        }
        if (href === '/afiliados') {
            return url === '/afiliados' || url.startsWith('/afiliados/');
        }
        if (href === '/produtos') {
            if (
                url.startsWith('/produtos/cupons') ||
                url.startsWith('/produtos/alunos') ||
                url.startsWith('/produtos/coproducao') ||
                url.startsWith('/produtos/vitrine-afiliacao') ||
                url.startsWith('/produtos/afiliados') ||
                /\/painel-afiliado/.test(url)
            ) {
                return false;
            }
            return url === '/produtos' || url.startsWith('/produtos/');
        }
        if (href === '/aplicacoes-api') {
            return url === '/aplicacoes-api' || url.startsWith('/aplicacoes-api/');
        }
        if (href === '/pixgo') {
            return url === '/pixgo' || url.startsWith('/pixgo/');
        }
        return url === href || url.startsWith(href + '/');
    }

    return {
        page,
        homeHref,
        appSettings,
        appName,
        hasLogoFull,
        hasLogoIcon,
        navItems,
        isActive,
    };
}
