<script setup>
import { Link } from '@inertiajs/vue3';
import { panelNavPrefetch } from '@/composables/useAppSidebarNav';
import PwaInstallButton from '@/components/layout/PwaInstallButton.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';

const props = defineProps({
    items: { type: Array, default: () => [] },
    showText: { type: Boolean, default: true },
    isActive: { type: Function, required: true },
    /** default | aurora | kawaii */
    variant: { type: String, default: 'default' },
    isMobile: { type: Boolean, default: false },
});

const emit = defineEmits(['item-mouseenter', 'item-mousemove', 'item-mouseleave']);

function onMouseEnter(e, label) {
    emit('item-mouseenter', e, label);
}

function onMouseMove(e) {
    emit('item-mousemove', e);
}

function onMouseLeave() {
    emit('item-mouseleave');
}

function linkClasses(href, isChild = false) {
    const active = props.isActive(href);
    if (props.variant === 'aurora') {
        return [
            'aurora-nav-link flex items-center gap-3 rounded-xl text-[13px] font-medium transition-colors',
            isChild ? 'py-2 pl-10 pr-3' : active ? 'py-2.5 pl-4 pr-3' : 'px-3 py-2.5',
            active ? 'aurora-nav-active' : '',
        ];
    }
    if (props.variant === 'kawaii') {
        return [
            'kawaii-nav-link flex items-center gap-3 text-[13px] font-semibold transition-colors',
            isChild ? 'py-2 pl-9 pr-3' : 'px-3 py-2.5',
            active ? 'kawaii-nav-active' : '',
        ];
    }
    return [
        'menu-item group relative',
        isChild ? 'py-2 pl-9' : '',
        props.showText ? 'justify-start' : 'lg:justify-center',
        active ? 'menu-item-active' : 'menu-item-inactive',
    ];
}

function iconClasses(href) {
    const active = props.isActive(href);
    if (props.variant === 'aurora') {
        return [
            'aurora-nav-icon flex h-5 w-5 shrink-0 items-center justify-center',
            active ? 'text-[var(--color-primary)]' : '',
        ];
    }
    if (props.variant === 'kawaii') {
        return ['kawaii-nav-icon h-[17px] w-[17px] shrink-0'];
    }
    return [active ? 'menu-item-icon-active' : 'menu-item-icon-inactive', 'shrink-0'];
}

function pluginBadgeTone(label) {
    const key = String(label || '').toLowerCase();
    if (key.includes('vitrine')) {
        return 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200';
    }
    if (key.includes('equipe')) {
        return 'border-teal-200/80 bg-teal-50 text-teal-800 dark:border-teal-800/60 dark:bg-teal-950/50 dark:text-teal-200';
    }
    return 'border-violet-200/80 bg-violet-50 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-200';
}

function itemTitle(item) {
    if (props.showText) return '';
    if (item.pluginBadge) return `${item.name} · ${item.pluginBadge}`;
    return item.name;
}
</script>

<template>
    <ul
        :class="[
            'flex flex-col overflow-visible',
            variant === 'default' ? 'gap-1' : variant === 'kawaii' ? 'gap-0.5' : 'gap-1.5',
        ]"
    >
        <template v-for="(item, index) in items" :key="item.separator ? `sep-${index}` : item.pwaInstall ? `pwa-${index}` : (item.href ?? index)">
            <!-- Seção com rótulo (guia: .mp-wpn__sidebar__section__label) — o
                 traço cego vira o nome do grupo, que é o que orienta a leitura. -->
            <li
                v-if="item.separator && item.label && variant === 'aurora'"
                class="aurora-nav-section"
                aria-hidden="true"
            >
                {{ item.label }}
            </li>
            <li v-else-if="item.separator" class="py-1" aria-hidden="true">
                <hr
                    :class="[
                        'border-t',
                        variant === 'default'
                            ? 'border-zinc-200 dark:border-zinc-700'
                            : variant === 'aurora'
                              ? 'border-[var(--aurora-border)]'
                              : 'border-[var(--kawaii-border)]',
                    ]"
                />
            </li>
            <li v-else-if="item.pwaInstall && isMobile && showText" class="pt-1.5 lg:hidden">
                <PwaInstallButton variant="banner" :theme="variant" />
            </li>
            <li v-else-if="!item.pwaInstall" class="overflow-visible">
                <Link
                    :href="item.href"
                    :prefetch="panelNavPrefetch"
                    :title="itemTitle(item)"
                    :class="linkClasses(item.href)"
                    @mouseenter="(e) => onMouseEnter(e, item.name)"
                    @mousemove="onMouseMove"
                    @mouseleave="onMouseLeave"
                >
                    <span :class="iconClasses(item.href)">
                        <AndesIcon v-if="typeof item.icon === 'string'" :name="item.icon" class="h-5 w-5" />
                        <component v-else :is="item.icon" class="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span v-if="showText" class="flex min-w-0 flex-1 items-center gap-1.5 truncate">
                        <span class="truncate">{{ item.name }}</span>
                        <span
                            v-if="item.pluginBadge"
                            :class="[
                                'inline-flex shrink-0 items-center rounded-md border px-1.5 py-px text-[9px] font-semibold leading-tight tracking-wide',
                                pluginBadgeTone(item.pluginBadge),
                            ]"
                            :title="item.pluginBadge"
                        >
                            {{ item.pluginBadge }}
                        </span>
                    </span>
                    <span v-else class="hidden">{{ item.name }}</span>
                </Link>
                <ul
                    v-if="showText && item.children?.length"
                    class="mt-0.5 flex flex-col gap-0.5"
                >
                    <li v-for="child in item.children" :key="child.href">
                        <Link
                            :href="child.href"
                            :prefetch="panelNavPrefetch"
                            :class="linkClasses(child.href, true)"
                            @mouseenter="(e) => onMouseEnter(e, child.name)"
                            @mousemove="onMouseMove"
                            @mouseleave="onMouseLeave"
                        >
                            <span :class="iconClasses(child.href)">
                                <AndesIcon v-if="typeof child.icon === 'string'" :name="child.icon" class="h-4 w-4" />
                                <component v-else :is="child.icon" class="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span class="truncate text-[13px]">{{ child.name }}</span>
                        </Link>
                    </li>
                </ul>
            </li>
        </template>
    </ul>
</template>
