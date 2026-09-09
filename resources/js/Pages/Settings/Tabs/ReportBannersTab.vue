<script setup>
/**
 * Banners do topo da tela de Relatórios do vendedor.
 * Mesmo fluxo do DashboardBannersTab; a diferença é a chave, as medidas
 * (3:1 no desktop) e o campo de link — o banner do relatório é peça de
 * parceiro e precisa levar para algum lugar.
 */
import { onMounted, ref } from 'vue';
import Button from '@/components/ui/Button.vue';
import { Upload, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-vue-next';

const DEFAULT_SPECS = {
    desktop: { width: 1800, height: 600, label: '1800×600 px', ratio: '3:1' },
    mobile: { width: 1200, height: 500, label: '1200×500 px', ratio: '2,4:1' },
};

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const items = ref([]);
const uploadingKey = ref('');
const specs = ref({ ...DEFAULT_SPECS });

function uid() {
    return `report_banner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalize(list) {
    return (Array.isArray(list) ? list : []).map((item, index) => ({
        id: item?.id || uid(),
        title: item?.title || '',
        href: item?.href || '',
        desktop_url: item?.desktop_url || '',
        mobile_url: item?.mobile_url || '',
        active: item?.active !== false,
        sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index + 1,
    }));
}

function specLabel(variant) {
    return specs.value[variant]?.label || DEFAULT_SPECS[variant]?.label || '';
}

function specRatio(variant) {
    return specs.value[variant]?.ratio || DEFAULT_SPECS[variant]?.ratio || '';
}

function aspect(variant) {
    const s = specs.value[variant] || DEFAULT_SPECS[variant];
    return `${s.width} / ${s.height}`;
}

function validateImageDimensions(file, variant) {
    const expected = specs.value[variant] || DEFAULT_SPECS[variant];
    if (!expected) {
        return Promise.reject(new Error('Variante de banner inválida.'));
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            if (img.naturalWidth === expected.width && img.naturalHeight === expected.height) {
                resolve();
                return;
            }
            reject(
                new Error(
                    `A imagem ${variant === 'mobile' ? 'mobile' : 'desktop'} deve ter exatamente ${expected.label} (arquivo: ${img.naturalWidth}×${img.naturalHeight}).`
                )
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Não foi possível ler a imagem selecionada.'));
        };

        img.src = objectUrl;
    });
}

async function load() {
    loading.value = true;
    error.value = '';
    try {
        const res = await window.axios.get('/plataforma/configuracoes/banners-relatorios/data');
        items.value = normalize(res.data?.banners || []);
        if (res.data?.specs) {
            specs.value = { ...DEFAULT_SPECS, ...res.data.specs };
        }
    } catch (e) {
        error.value = e?.response?.data?.message || 'Não foi possível carregar os banners de relatórios.';
    } finally {
        loading.value = false;
    }
}

function addItem() {
    items.value.push({
        id: uid(),
        title: '',
        href: '',
        desktop_url: '',
        mobile_url: '',
        active: true,
        sort_order: items.value.length + 1,
    });
}

function removeItem(index) {
    items.value.splice(index, 1);
    items.value.forEach((item, idx) => {
        item.sort_order = idx + 1;
    });
}

function moveItem(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.value.length) return;
    const temp = items.value[index];
    items.value[index] = items.value[target];
    items.value[target] = temp;
    items.value.forEach((item, idx) => {
        item.sort_order = idx + 1;
    });
}

async function uploadImage(event, item, variant) {
    const file = event.target?.files?.[0];
    event.target.value = '';
    if (!file) return;

    const key = `${item.id}-${variant}`;
    uploadingKey.value = key;
    error.value = '';

    try {
        await validateImageDimensions(file, variant);

        const fd = new FormData();
        fd.append('file', file);
        fd.append('variant', variant);

        const res = await window.axios.post('/plataforma/configuracoes/banners-relatorios/upload', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = res.data?.url || '';
        if (variant === 'desktop') item.desktop_url = url;
        if (variant === 'mobile') item.mobile_url = url;
    } catch (e) {
        const apiMsg = e?.response?.data?.errors?.file?.[0] || e?.response?.data?.message;
        error.value = apiMsg || e?.message || 'Erro ao enviar imagem do banner.';
    } finally {
        uploadingKey.value = '';
    }
}

async function save() {
    saving.value = true;
    error.value = '';
    try {
        const payload = items.value.map((item, index) => ({
            id: item.id || uid(),
            title: item.title || '',
            href: (item.href || '').trim(),
            desktop_url: item.desktop_url || '',
            mobile_url: item.mobile_url || '',
            active: !!item.active,
            sort_order: index + 1,
        }));
        await window.axios.put('/plataforma/configuracoes/banners-relatorios', { banners: payload });
        await load();
    } catch (e) {
        const first = e?.response?.data?.errors ? Object.values(e.response.data.errors)[0]?.[0] : null;
        error.value = first || e?.response?.data?.message || 'Erro ao salvar banners de relatórios.';
    } finally {
        saving.value = false;
    }
}

onMounted(load);
</script>

<template>
    <section class="overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/50">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h2 class="text-base font-semibold text-zinc-900 dark:text-white">Banners de Relatórios</h2>
                <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Carrossel no topo da tela de Relatórios do vendedor. Troca sozinho a cada 6 segundos, pausa quando o
                    mouse está em cima e abre o link numa aba nova.
                </p>
            </div>
            <Button type="button" class="inline-flex items-center gap-2" @click="addItem">
                <Plus class="h-4 w-4" />
                Adicionar banner
            </Button>
        </div>

        <!-- Tamanhos: fica em destaque porque o upload recusa qualquer outra medida -->
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900/40">
                <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Desktop</p>
                <p class="mt-1 text-lg font-bold text-zinc-900 dark:text-white">{{ specLabel('desktop') }}</p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">Proporção {{ specRatio('desktop') }} — a mesma faixa larga do topo.</p>
            </div>
            <div class="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900/40">
                <p class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Mobile</p>
                <p class="mt-1 text-lg font-bold text-zinc-900 dark:text-white">{{ specLabel('mobile') }}</p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">Proporção {{ specRatio('mobile') }} — mais alta, senão vira um filete no celular.</p>
            </div>
        </div>
        <p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Medidas exatas e obrigatórias: o envio é recusado fora delas, porque recorte automático estraga a arte.
            Formatos aceitos: JPG, PNG, WebP ou GIF, até 8 MB. Sem imagem mobile, o desktop é usado nos dois.
        </p>

        <p
            v-if="error"
            class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
        >
            {{ error }}
        </p>

        <div v-if="loading" class="mt-6 text-sm text-zinc-500">Carregando banners...</div>

        <div v-else class="mt-6 space-y-4">
            <div
                v-for="(item, index) in items"
                :key="item.id"
                class="rounded-xl border border-zinc-200 p-4 dark:border-zinc-600"
            >
                <div class="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                        <label class="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Título (texto alternativo)</label>
                        <input
                            v-model="item.title"
                            type="text"
                            class="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                            placeholder="Ex.: Replic — crie sites em minutos"
                        />
                    </div>
                    <div class="flex items-center gap-2 pt-5">
                        <button type="button" class="rounded p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Subir" @click="moveItem(index, -1)">
                            <ArrowUp class="h-4 w-4" />
                        </button>
                        <button type="button" class="rounded p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Descer" @click="moveItem(index, 1)">
                            <ArrowDown class="h-4 w-4" />
                        </button>
                        <button type="button" class="rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800" aria-label="Remover" @click="removeItem(index)">
                            <Trash2 class="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Link de destino</label>
                    <input
                        v-model="item.href"
                        type="url"
                        inputmode="url"
                        class="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                        placeholder="https://…"
                    />
                    <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Só http:// ou https://. Sem link, o banner aparece mas não é clicável.
                    </p>
                </div>

                <label class="mb-3 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <input v-model="item.active" type="checkbox" class="h-4 w-4 rounded border-zinc-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                    Banner ativo
                </label>

                <div class="grid gap-4 md:grid-cols-2">
                    <div class="rounded-lg border border-zinc-200 p-3 dark:border-zinc-600">
                        <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Desktop</p>
                        <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {{ specLabel('desktop') }} ({{ specRatio('desktop') }}) — envie nesta medida exata.
                        </p>
                        <div v-if="item.desktop_url" class="mt-3 w-full overflow-hidden rounded" :style="{ aspectRatio: aspect('desktop') }">
                            <img :src="item.desktop_url" alt="Banner desktop" class="h-full w-full object-cover" />
                        </div>
                        <label class="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--color-primary)]">
                            <Upload class="h-4 w-4" />
                            {{ item.desktop_url ? 'Substituir desktop' : 'Enviar desktop' }}
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="(e) => uploadImage(e, item, 'desktop')" />
                        </label>
                        <p v-if="uploadingKey === `${item.id}-desktop`" class="mt-1 text-xs text-zinc-500">Enviando...</p>
                    </div>

                    <div class="rounded-lg border border-zinc-200 p-3 dark:border-zinc-600">
                        <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Mobile</p>
                        <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {{ specLabel('mobile') }} ({{ specRatio('mobile') }}) — envie nesta medida exata.
                        </p>
                        <div v-if="item.mobile_url" class="mt-3 w-full overflow-hidden rounded" :style="{ aspectRatio: aspect('mobile') }">
                            <img :src="item.mobile_url" alt="Banner mobile" class="h-full w-full object-cover" />
                        </div>
                        <label class="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--color-primary)]">
                            <Upload class="h-4 w-4" />
                            {{ item.mobile_url ? 'Substituir mobile' : 'Enviar mobile' }}
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="(e) => uploadImage(e, item, 'mobile')" />
                        </label>
                        <p v-if="uploadingKey === `${item.id}-mobile`" class="mt-1 text-xs text-zinc-500">Enviando...</p>
                    </div>
                </div>
            </div>

            <div v-if="!items.length" class="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/40">
                Nenhum banner cadastrado. Sem banner ativo, o carrossel some da tela de Relatórios.
            </div>

            <div class="pt-2">
                <Button type="button" :disabled="saving" @click="save">
                    {{ saving ? 'Salvando...' : 'Salvar banners de relatórios' }}
                </Button>
            </div>
        </div>
    </section>
</template>
