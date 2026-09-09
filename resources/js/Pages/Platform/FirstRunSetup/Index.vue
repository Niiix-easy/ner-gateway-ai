<script setup>
/**
 * Primeira configuração da plataforma.
 *
 * É a primeira tela do operador depois de criar o administrador: nome, cor,
 * logotipo e contato. Fica fora do layout do painel de propósito — o painel só
 * abre depois que este passo é concluído.
 */
import { ref } from 'vue';
import { Head, useForm, router } from '@inertiajs/vue3';

const props = defineProps({
    initial: { type: Object, default: () => ({}) },
    logos: { type: Object, default: () => ({}) },
});

const form = useForm({
    app_name: props.initial.app_name || '',
    theme_primary: props.initial.theme_primary || '#2135FA',
    login_hero_tagline: props.initial.login_hero_tagline || '',
    login_hero_subtagline: props.initial.login_hero_subtagline || '',
    support_whatsapp: props.initial.support_whatsapp || '',
    mail_from_address: props.initial.mail_from_address || '',
    mail_from_name: props.initial.mail_from_name || '',
    app_url: props.initial.app_url || '',
    accept_responsibility: false,
});

const uploadFields = [
    { key: 'app_logo', label: 'Logotipo (tema claro)', hint: 'PNG ou SVG, fundo transparente.' },
    { key: 'app_logo_dark', label: 'Logotipo (tema escuro)', hint: 'Opcional. Sem isso, usa o claro.' },
    { key: 'app_logo_icon', label: 'Símbolo / ícone', hint: 'Quadrado. Usado na sidebar recolhida e no PWA.' },
    { key: 'favicon_url', label: 'Favicon', hint: 'PNG 64×64 ou .ico.' },
];

const previews = ref({ ...props.logos });
const uploading = ref('');
const uploadError = ref('');

async function onPickFile(field, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    uploading.value = field;
    uploadError.value = '';
    try {
        const body = new FormData();
        body.append('field', field);
        body.append('file', file);
        const res = await fetch('/plataforma/primeiros-passos/upload', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
            },
            body,
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            throw new Error(data.message || 'Falha no envio da imagem.');
        }
        previews.value = { ...previews.value, [field]: data.url };
    } catch (e) {
        uploadError.value = e.message || 'Falha no envio da imagem.';
    }
    uploading.value = '';
    event.target.value = '';
}

function submit() {
    form.post('/plataforma/primeiros-passos', { preserveScroll: true });
}

function logout() {
    router.post('/plataforma/logout');
}
</script>

<template>
    <Head title="Primeira configuração" />

    <div class="min-h-screen bg-zinc-100 px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div class="mx-auto w-full max-w-3xl space-y-8">
            <header class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Primeira configuração</p>
                <h1 class="text-3xl font-bold tracking-tight">Dê identidade à sua plataforma</h1>
                <p class="text-sm text-zinc-600 dark:text-zinc-400">
                    Tudo aqui pode ser alterado depois em <strong>Configurações → Personalização</strong>.
                    Esta tela existe para a plataforma já nascer com a sua marca.
                </p>
            </header>

            <form class="space-y-8" @submit.prevent="submit">
                <!-- Marca -->
                <section class="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
                    <h2 class="text-lg font-semibold">Marca</h2>

                    <div>
                        <label for="app_name" class="block text-sm font-medium">Nome da plataforma <span class="text-red-500">*</span></label>
                        <input
                            id="app_name"
                            v-model="form.app_name"
                            type="text"
                            required
                            maxlength="120"
                            placeholder="Ex.: Minha Plataforma"
                            class="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-950"
                        >
                        <p v-if="form.errors.app_name" class="mt-1 text-sm text-red-600">{{ form.errors.app_name }}</p>
                        <p class="mt-1 text-xs text-zinc-500">Aparece no painel, nos e-mails, no checkout e no PWA.</p>
                    </div>

                    <div>
                        <label for="theme_primary" class="block text-sm font-medium">Cor principal <span class="text-red-500">*</span></label>
                        <div class="mt-1.5 flex items-center gap-3">
                            <input
                                id="theme_primary"
                                v-model="form.theme_primary"
                                type="color"
                                class="h-12 w-16 cursor-pointer rounded-xl border border-zinc-300 bg-white p-1 dark:border-zinc-600 dark:bg-zinc-950"
                            >
                            <input
                                v-model="form.theme_primary"
                                type="text"
                                maxlength="7"
                                class="block w-40 rounded-xl border border-zinc-300 bg-white px-4 py-3 font-mono uppercase dark:border-zinc-600 dark:bg-zinc-950"
                            >
                        </div>
                        <p v-if="form.errors.theme_primary" class="mt-1 text-sm text-red-600">{{ form.errors.theme_primary }}</p>
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <div v-for="f in uploadFields" :key="f.key" class="rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
                            <p class="text-sm font-medium">{{ f.label }}</p>
                            <div class="mt-3 flex h-16 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                                <img v-if="previews[f.key]" :src="previews[f.key]" :alt="f.label" class="max-h-14 max-w-full object-contain">
                                <span v-else class="text-xs text-zinc-500">sem imagem</span>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                :disabled="uploading === f.key"
                                class="mt-3 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-xs file:font-medium dark:file:bg-zinc-700"
                                @change="onPickFile(f.key, $event)"
                            >
                            <p class="mt-1 text-xs text-zinc-500">{{ uploading === f.key ? 'Enviando…' : f.hint }}</p>
                        </div>
                    </div>
                    <p v-if="uploadError" class="text-sm text-red-600">{{ uploadError }}</p>
                </section>

                <!-- Tela de login -->
                <section class="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
                    <h2 class="text-lg font-semibold">Tela de entrada</h2>
                    <div>
                        <label for="tagline" class="block text-sm font-medium">Chamada principal</label>
                        <input
                            id="tagline"
                            v-model="form.login_hero_tagline"
                            type="text"
                            maxlength="180"
                            placeholder="Sua plataforma para vender mais."
                            class="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-950"
                        >
                    </div>
                    <div>
                        <label for="subtagline" class="block text-sm font-medium">Texto de apoio</label>
                        <textarea
                            id="subtagline"
                            v-model="form.login_hero_subtagline"
                            rows="2"
                            maxlength="280"
                            class="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-950"
                        ></textarea>
                    </div>
                </section>

                <!-- Operação -->
                <section class="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
                    <h2 class="text-lg font-semibold">Operação</h2>
                    <div>
                        <label for="app_url" class="block text-sm font-medium">URL pública</label>
                        <input
                            id="app_url"
                            v-model="form.app_url"
                            type="url"
                            placeholder="https://seudominio.com"
                            class="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-950"
                        >
                        <p v-if="form.errors.app_url" class="mt-1 text-sm text-red-600">{{ form.errors.app_url }}</p>
                        <p class="mt-1 text-xs text-zinc-500">Usada para montar links de checkout e webhooks. Precisa ser HTTPS em produção.</p>
                    </div>
                    <div class="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label for="mail_from_name" class="block text-sm font-medium">Nome do remetente</label>
                            <input
                                id="mail_from_name"
                                v-model="form.mail_from_name"
                                type="text"
                                maxlength="120"
                                class="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-950"
                            >
                        </div>
                        <div>
                            <label for="mail_from_address" class="block text-sm font-medium">E-mail do remetente</label>
                            <input
                                id="mail_from_address"
                                v-model="form.mail_from_address"
                                type="email"
                                placeholder="nao-responda@seudominio.com"
                                class="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-950"
                            >
                            <p v-if="form.errors.mail_from_address" class="mt-1 text-sm text-red-600">{{ form.errors.mail_from_address }}</p>
                        </div>
                    </div>
                    <div>
                        <label for="support_whatsapp" class="block text-sm font-medium">WhatsApp de suporte aos sellers</label>
                        <input
                            id="support_whatsapp"
                            v-model="form.support_whatsapp"
                            type="text"
                            maxlength="40"
                            placeholder="5511999999999"
                            class="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-600 dark:bg-zinc-950"
                        >
                        <p class="mt-1 text-xs text-zinc-500">Opcional. Preenchido, liga o botão de suporte no painel do seller.</p>
                    </div>
                </section>

                <!-- Responsabilidade -->
                <section class="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                    <h2 class="text-lg font-semibold">Termo de responsabilidade</h2>
                    <p class="text-sm leading-relaxed">
                        Este software é fornecido <strong>“no estado em que se encontra” (as is)</strong>, sem garantia
                        de qualquer natureza, expressa ou implícita. A partir desta instalação, a responsabilidade é
                        <strong>inteiramente sua</strong>: segurança da aplicação e do servidor, proteção e vazamento de
                        dados, conformidade legal, fiscal e regulatória, prevenção a fraude e lavagem de dinheiro,
                        chargebacks, disponibilidade, backups, atualizações, credenciais de gateways de pagamento e
                        qualquer conteúdo ou operação dos seus clientes.
                    </p>
                    <p class="text-sm leading-relaxed">
                        Quem forneceu este código não presta suporte, não opera, não monitora e não responde por
                        nada que aconteça nesta instalação. Detalhes em <code class="text-xs">docs/RESPONSABILIDADE.md</code>.
                    </p>
                    <label class="flex items-start gap-3 text-sm font-medium">
                        <input v-model="form.accept_responsibility" type="checkbox" class="mt-1 h-4 w-4 rounded border-amber-500">
                        <span>Li, entendi e assumo integralmente a responsabilidade pela operação desta plataforma.</span>
                    </label>
                    <p v-if="form.errors.accept_responsibility" class="text-sm font-semibold text-red-700 dark:text-red-400">
                        {{ form.errors.accept_responsibility }}
                    </p>
                </section>

                <div class="flex items-center justify-between gap-4 pb-10">
                    <button type="button" class="text-sm text-zinc-500 underline-offset-2 hover:underline" @click="logout">
                        Sair
                    </button>
                    <button
                        type="submit"
                        :disabled="form.processing || !form.accept_responsibility"
                        class="rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900"
                    >
                        {{ form.processing ? 'Salvando…' : 'Concluir e abrir o painel' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>
