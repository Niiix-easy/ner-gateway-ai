<script setup>
/** Primeiro administrador da instalação — mesma casca Andes do login. */
import { ref } from 'vue';
import { useForm } from '@inertiajs/vue3';
import AuthAndesShell from '@/components/auth/AuthAndesShell.vue';
import AuthAndesField from '@/components/auth/AuthAndesField.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';

defineProps({
    boot_error: { type: String, default: null },
});

const showPassword = ref(false);
const showPasswordConfirmation = ref(false);

const form = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
});

function submit() {
    form.post('/criar-admin', {
        onFinish: () => form.reset('password', 'password_confirmation'),
    });
}
</script>

<template>
    <AuthAndesShell
        title="Criar administrador"
        subtitle="Configure o primeiro usuário da plataforma para começar."
        banner-title="Primeiro acesso da plataforma."
        banner-text="Esta conta manda em tudo: usuários, gateways e configuração."
        :facts="[]"
        force-light
    >
        <div v-if="boot_error" class="andes-ui-message andes-ui-message--negative andes-auth__alert">
            <span class="andes-ui-message__text">{{ boot_error }}</span>
        </div>

        <form class="andes-auth__form" @submit.prevent="submit">
            <AuthAndesField
                id="name"
                v-model="form.name"
                label="Nome"
                type="text"
                autocomplete="name"
                placeholder="Seu nome"
                required
                :error="form.errors.name"
            />

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

            <AuthAndesField
                id="password"
                v-model="form.password"
                label="Senha"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Crie uma senha"
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
                placeholder="Repita a senha"
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
                {{ form.processing ? 'Criando…' : 'Criar e entrar' }}
            </button>
        </form>
    </AuthAndesShell>
</template>
