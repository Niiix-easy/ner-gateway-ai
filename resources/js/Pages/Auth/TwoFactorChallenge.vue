<script setup>
/** Verificação em dois fatores — mesma casca Andes do login. */
import { computed } from 'vue';
import { useForm, usePage } from '@inertiajs/vue3';
import AuthAndesShell from '@/components/auth/AuthAndesShell.vue';
import AuthAndesField from '@/components/auth/AuthAndesField.vue';
import LegalFooterLinks from '@/components/legal/LegalFooterLinks.vue';

const props = defineProps({
    submitUrl: { type: String, required: true },
    cancelUrl: { type: String, required: true },
    title: { type: String, default: 'Verificação em dois fatores' },
});

const page = usePage();
const flashError = computed(() => page.props.flash?.error ?? null);

const form = useForm({
    totp_code: '',
});

function submit() {
    form.post(props.submitUrl, { preserveScroll: true });
}

function cancel() {
    form.post(props.cancelUrl);
}
</script>

<template>
    <AuthAndesShell
        :title="title"
        subtitle="Digite o código de 6 dígitos do seu aplicativo autenticador."
        banner-title="Mais uma etapa e a conta é sua de novo."
        banner-text="O segundo fator bloqueia o acesso mesmo quando a senha vaza."
        :facts="[]"
    >
        <template #topbar-end>
            <button type="button" class="andes-ui-button andes-ui-button--quiet andes-ui-button--medium" @click="cancel">
                Voltar ao login
            </button>
        </template>

        <div v-if="flashError" class="andes-ui-message andes-ui-message--negative andes-auth__alert">
            <span class="andes-ui-message__text">{{ flashError }}</span>
        </div>

        <form class="andes-auth__form" @submit.prevent="submit">
            <AuthAndesField
                id="totp_code"
                v-model="form.totp_code"
                label="Código 2FA"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                placeholder="000000"
                input-class="andes-auth__otp"
                :maxlength="6"
                required
                :error="form.errors.totp_code"
            />

            <button
                type="submit"
                class="andes-ui-button andes-ui-button--loud andes-ui-button--large andes-ui-button--full-width"
                :disabled="form.processing"
            >
                {{ form.processing ? 'Verificando…' : 'Confirmar e entrar' }}
            </button>
        </form>

        <template #footer>
            <LegalFooterLinks />
        </template>
    </AuthAndesShell>
</template>
