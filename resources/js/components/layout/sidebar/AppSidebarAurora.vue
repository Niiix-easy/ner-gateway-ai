<script setup>
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { X } from 'lucide-vue-next';
import { useSidebar } from '@/composables/useSidebar';
import ConquistasWidget from '@/components/layout/ConquistasWidget.vue';
import AppSidebarNavList from '@/components/layout/sidebar/AppSidebarNavList.vue';
import { useAppSidebarNav, panelNavPrefetch } from '@/composables/useAppSidebarNav';

const { isMobileOpen, toggleSidebar, isMobile } = useSidebar();
const {
    page,
    homeHref,
    appSettings,
    appName,
    hasLogoFull,
    hasLogoIcon,
    navItems,
    isActive,
} = useAppSidebarNav();

/**
 * O logotipo deitado é a marca da casa e manda no cabeçalho da barra — quem se
 * ajusta a ele é o menu (ver .andes-brand no dashboard-andes.css: a borboleta
 * cai exatamente na coluna dos ícones do menu). O ladrilho com o símbolo só
 * entra como saída para o white label que não subiu logotipo.
 */
const brandIcon = computed(() => appSettings().app_logo_icon || appSettings().app_logo_icon_dark || '');
const brandIconDark = computed(() => appSettings().app_logo_icon_dark || appSettings().app_logo_icon || '');
const brandRole = computed(() => (page.props.customer_panel ? 'Área do cliente' : 'Painel do vendedor'));
</script>

<template>
    <aside
        :class="[
            'aurora-sidebar fixed left-0 top-0 z-[99999] flex h-screen flex-col',
            'transition-transform duration-300 ease-in-out',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full',
            isMobile && !isMobileOpen ? 'pointer-events-none' : '',
            'lg:translate-x-0',
        ]"
    >
        <div class="aurora-sidebar-header relative z-[1] flex h-[72px] shrink-0 items-center justify-between gap-2 pl-8 pr-5">
            <Link :href="homeHref" :prefetch="panelNavPrefetch" class="andes-brand">
                <template v-if="hasLogoFull()">
                    <img
                        v-if="appSettings().app_logo"
                        :src="appSettings().app_logo"
                        :alt="appName()"
                        class="andes-brand__wordmark dark:hidden"
                    />
                    <img
                        :src="appSettings().app_logo_dark || appSettings().app_logo"
                        :alt="appName()"
                        class="andes-brand__wordmark hidden dark:block"
                    />
                </template>

                <template v-else-if="hasLogoIcon()">
                    <img :src="brandIcon" :alt="appName()" class="andes-brand__tile dark:hidden" />
                    <img :src="brandIconDark" :alt="appName()" class="andes-brand__tile hidden dark:block" />
                    <span class="andes-brand__text">
                        <span class="andes-brand__name">{{ appName() }}</span>
                        <span class="andes-brand__role">{{ brandRole }}</span>
                    </span>
                </template>

                <span v-else class="andes-brand__text">
                    <span class="andes-brand__name">{{ appName() }}</span>
                    <span class="andes-brand__role">{{ brandRole }}</span>
                </span>
            </Link>
            <button
                v-if="isMobile"
                type="button"
                class="aurora-icon-btn ml-1 flex h-9 w-9 shrink-0 touch-manipulation cursor-pointer select-none items-center justify-center rounded-xl"
                aria-label="Fechar menu"
                @click="toggleSidebar"
            >
                <X class="h-4 w-4" aria-hidden="true" />
            </button>
        </div>

        <nav class="aurora-sidebar-nav relative z-[1] flex-1 overflow-y-auto no-scrollbar px-3 py-3">
            <AppSidebarNavList
                :items="navItems"
                :show-text="true"
                :is-active="isActive"
                :is-mobile="isMobile"
                variant="aurora"
            />
        </nav>

        <div class="aurora-sidebar-footer relative z-[1] shrink-0 space-y-3 px-3 pb-4 pt-2">
            <ConquistasWidget v-if="!page.props.customer_panel" variant="sidebar" />
        </div>
    </aside>
</template>
