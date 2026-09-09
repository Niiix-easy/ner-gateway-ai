<script setup>
/** Redefinir senha — mesma casca Andes do login. */
import { ref } from 'vue';
import { useForm, Link } from '@inertiajs/vue3';
import AuthAndesShell from '@/components/auth/AuthAndesShell.vue';
import AuthAndesField from '@/components/auth/AuthAndesField.vue';
import LegalFooterLinks from '@/components/legal/LegalFooterLinks.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';

const props = defineProps({
    token: { type: String, required: true },
    email: { type: String, default: '' },
    redirect: { type: String, default: '' },
});

const showPassword = ref(false);
const showPasswordConfirmation = ref(false);

const form = useForm({
    token: props.token,
    email: props.email || '',
    password: '',
    password_confirmation: '',
    redirect: props.redirect || '',
});

function submit() {
    form.post('/redefinir-senha', {
        onFinish: () => form.reset('password', 'password_confirmation'),
    });
}
</script>

<template>
    <AuthAndesShell
        title="Redefinir senha"
        subtitle="Escolha uma senha nova para voltar ao painel."
        banner-title="Senha nova, acesso de volta."
        banner-text="Use uma senha que você não repita em outro serviço."
        :facts="[]"
    >
        <template #topbar-end>
            <Link href="/login" class="andes-ui-button andes-ui-button--quiet andes-ui-button--medium">
                Voltar ao login
            </Link>
        </template>

        <form class="andes-auth__form" @submit.prevent="submit">
            <input v-model="form.token" type="hidden" name="token" />
            <input v-if="form.redirect" v-model="form.redirect" type="hidden" name="redirect" />

            <AuthAndesField
                id="email"
                v-model="form.email"
                label="E-mail"
                type="email"
                autocomplete="username"
                placeholder="seu@email.com"
                required
                :error="form.errors.email"
            />

            <AuthAndesField
                id="password"
                v-model="form.password"
                label="Nova senha"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Sua nova senha"
                required
                :error="form.errors.password"
            >
                <template #trailing>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--mute andes-ui-icon-button andes-auth__reveal"
                        :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                        @click="showPassword = !showPassword"
                    >
                        <AndesIcon :name="showPassword ? 'eye-closed' : 'eye'" />
                    </button>
                </template>
            </AuthAndesField>

            <AuthAndesField
                id="password_confirmation"
                v-model="form.password_confirmation"
                label="Confirmar senha"
                :type="showPasswordConfirmation ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Repita a nova senha"
                required
                :error="form.errors.password_confirmation"
            >
                <template #trailing>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--mute andes-ui-icon-button andes-auth__reveal"
                        :aria-label="showPasswordConfirmation ? 'Ocultar senha' : 'Mostrar senha'"
                        @click="showPasswordConfirmation = !showPasswordConfirmation"
                    >
                        <AndesIcon :name="showPasswordConfirmation ? 'eye-closed' : 'eye'" />
                    </button>
                </template>
            </AuthAndesField>

            <button
                type="submit"
                class="andes-ui-button andes-ui-button--loud andes-ui-button--large andes-ui-button--full-width"
                :disabled="form.processing"
            >
                {{ form.processing ? 'Salvando…' : 'Salvar e entrar' }}
            </button>
        </form>

        <template #footer>
            <LegalFooterLinks />
        </template>
    </AuthAndesShell>
</template>
