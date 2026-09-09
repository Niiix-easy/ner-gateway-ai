<script setup>
import { computed, onMounted, ref } from 'vue';
import Button from '@/components/ui/Button.vue';
import { Sun, Moon, Monitor } from 'lucide-vue-next';

const schemeLoading = ref(true);
const schemeSaving = ref(false);
const schemeError = ref('');
const schemeSuccess = ref('');
const schemeUiMode = ref('auto');
const schemeTheme = ref('dark');

const schemeOptions = [
    {
        id: 'auto',
        label: 'Automático',
        description: 'Segue a preferência do sistema do usuário. O botão de alternância continua visível.',
        icon: Monitor,
    },
    {
        id: 'prefer',
        label: 'Forçar tema',
        description: 'Define claro ou escuro como padrão, mas o usuário ainda pode alternar manualmente.',
        icon: Sun,
    },
    {
        id: 'fixed',
        label: 'Tema fixo',
        description: 'Mantém um único tema em todo o painel, sem botão de alternância.',
        icon: Moon,
    },
];

function mapApiToUi({ mode, locked }) {
    if (mode === 'system' && !locked) {
        schemeUiMode.value = 'auto';
        schemeTheme.value = 'dark';
        return;
    }

    if ((mode === 'light' || mode === 'dark') && !locked) {
        schemeUiMode.value = 'prefer';
        schemeTheme.value = mode;
        return;
    }

    if ((mode === 'light' || mode === 'dark') && locked) {
        schemeUiMode.value = 'fixed';
        schemeTheme.value = mode;
        return;
    }

    schemeUiMode.value = 'auto';
    schemeTheme.value = 'dark';
}

function mapUiToApi() {
    if (schemeUiMode.value === 'auto') {
        return { mode: 'system', locked: false };
    }

    if (schemeUiMode.value === 'prefer') {
        return { mode: schemeTheme.value, locked: false };
    }

    return { mode: schemeTheme.value, locked: true };
}

const showThemeSelect = computed(() => schemeUiMode.value === 'prefer' || schemeUiMode.value === 'fixed');

async function loadScheme() {
    schemeLoading.value = true;
    schemeError.value = '';
    try {
        const res = await window.axios.get('/plataforma/configuracoes/panel-color-scheme/data');
        mapApiToUi(res.data ?? { mode: 'dark', locked: false });
    } catch (e) {
        schemeError.value = e?.response?.data?.message || 'Não foi possível carregar o tema.';
    } finally {
        schemeLoading.value = false;
    }
}

async function saveScheme() {
    schemeSaving.value = true;
    schemeError.value = '';
    schemeSuccess.value = '';
    try {
        const payload = mapUiToApi();
        const res = await window.axios.put('/plataforma/configuracoes/panel-color-scheme', payload);
        mapApiToUi(res.data ?? payload);
        schemeSuccess.value = 'Tema salvo. A alteração vale para todo o painel ao recarregar a página.';
    } catch (e) {
        schemeError.value = e?.response?.data?.message || 'Não foi possível salvar o tema.';
    } finally {
        schemeSaving.value = false;
    }
}

onMounted(() => {
    void loadScheme();
});
</script>

<template>
    <div class="space-y-6">
        <section class="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
            <div class="mb-6 flex items-start gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                    <Sun class="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                    <h2 class="text-base font-semibold text-zinc-900 dark:text-white">Tema claro/escuro</h2>
                    <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Controla o tema padrão do painel, login e demais telas. Vale para todos os usuários da plataforma.
                        A cor da marca continua em <strong class="font-medium">Personalização</strong>.
                    </p>
                </div>
            </div>

            <p v-if="schemeLoading" class="text-sm text-zinc-500">Carregando…</p>
            <p v-if="schemeError" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {{ schemeError }}
            </p>
            <p v-if="schemeSuccess" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                {{ schemeSuccess }}
            </p>

            <div v-if="!schemeLoading" class="space-y-3">
                <label
                    v-for="opt in schemeOptions"
                    :key="opt.id"
                    class="flex cursor-pointer gap-3 rounded-xl border p-4 transition"
                    :class="schemeUiMode === opt.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-600 dark:hover:border-zinc-500'"
                >
                    <input
                        v-model="schemeUiMode"
                        class="mt-1"
                        type="radio"
                        name="panel_color_scheme_mode"
                        :value="opt.id"
                    >
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                        <component :is="opt.icon" class="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span class="min-w-0 flex-1">
                        <span class="block text-sm font-semibold text-zinc-900 dark:text-white">{{ opt.label }}</span>
                        <span class="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">{{ opt.description }}</span>
                    </span>
                </label>

                <div v-if="showThemeSelect" class="ml-8 flex flex-wrap items-center gap-3">
                    <label class="text-sm text-zinc-700 dark:text-zinc-300" for="panel-scheme-theme">Tema:</label>
                    <select
                        id="panel-scheme-theme"
                        v-model="schemeTheme"
                        class="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                    </select>
                </div>
            </div>

            <div v-if="!schemeLoading" class="mt-6 flex justify-end">
                <Button type="button" :disabled="schemeSaving" @click="saveScheme">
                    {{ schemeSaving ? 'Salvando…' : 'Salvar tema' }}
                </Button>
            </div>
        </section>
    </div>
</template>
