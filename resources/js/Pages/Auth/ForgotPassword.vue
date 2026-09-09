<script setup>
/** Recuperar senha — mesma casca Andes do login. */
import { computed } from 'vue';
import { useForm, Link, usePage } from '@inertiajs/vue3';
import AuthAndesShell from '@/components/auth/AuthAndesShell.vue';
import AuthAndesField from '@/components/auth/AuthAndesField.vue';
import LegalFooterLinks from '@/components/legal/LegalFooterLinks.vue';

const page = usePage();
const status = computed(() => page.props.flash?.status ?? null);

const form = useForm({
    email: '',
});

function submit() {
    form.post('/esqueci-senha', {
        preserveScroll: true,
        onFinish: () => form.reset('email'),
    });
}
</script>

<template>
    <AuthAndesShell
        title="Recuperar senha"
        subtitle="Informe seu e-mail para receber o link de redefinição."
        banner-title="Perdeu o acesso? Recupere em um minuto."
        banner-text="O link chega no seu e-mail e vale por tempo limitado."
        :facts="[]"
    >
        <template #topbar-end>
            <Link href="/login" class="andes-ui-button andes-ui-button--quiet andes-ui-button--medium">
                Voltar ao login
            </Link>
        </template>

        <div v-if="status" class="andes-ui-message andes-ui-message--positive andes-auth__alert">
            <span class="andes-ui-message__text">{{ status }}</span>
        </div>

        <form class="andes-auth__form" @submit.prevent="submit">
            <AuthAndesField
                id="email"
                v-model="form.email"
                label="E-mail"
                type="email"
                autocomplete="email"
                placeholder="seu@email.com"
                required
                :error="form.errors.email"
            />

            <button
                type="submit"
                class="andes-ui-button andes-ui-button--loud andes-ui-button--large andes-ui-button--full-width"
                :disabled="form.processing"
            >
                {{ form.processing ? 'Enviando…' : 'Enviar link' }}
            </button>
        </form>

        <template #footer>
            <LegalFooterLinks />
        </template>
    </AuthAndesShell>
</template>
