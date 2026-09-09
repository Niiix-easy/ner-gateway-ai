<script setup>
/** Confirmação de e-mail — mesma casca Andes do login. */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useForm, Link, usePage } from '@inertiajs/vue3';
import AuthAndesShell from '@/components/auth/AuthAndesShell.vue';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import LegalFooterLinks from '@/components/legal/LegalFooterLinks.vue';

const props = defineProps({
    email: { type: String, required: true },
    resend_available_in_seconds: { type: Number, default: 0 },
    resend_cooldown_seconds: { type: Number, default: 60 },
});

const page = usePage();
const resendForm = useForm({});
const countdown = ref(Math.max(0, Number(props.resend_available_in_seconds) || 0));
let countdownTimer = null;

const canResend = computed(() => countdown.value <= 0 && !resendForm.processing);

const resendButtonLabel = computed(() => {
    if (resendForm.processing) {
        return 'Enviando…';
    }
    if (countdown.value > 0) {
        return `Reenviar em ${countdown.value}s`;
    }
    return 'Reenviar e-mail';
});

function startCountdown(seconds) {
    countdown.value = Math.max(0, Number(seconds) || 0);
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    if (countdown.value <= 0) {
        return;
    }
    countdownTimer = setInterval(() => {
        if (countdown.value > 0) {
            countdown.value -= 1;
        }
        if (countdown.value <= 0 && countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
    }, 1000);
}

function submitResend() {
    if (!canResend.value) {
        return;
    }
    resendForm.post('/email/verificacao/reenviar', {
        preserveScroll: true,
        onSuccess: () => startCountdown(props.resend_cooldown_seconds),
    });
}

onMounted(() => startCountdown(props.resend_available_in_seconds));
onBeforeUnmount(() => {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
});

const flashSuccess = computed(() => page.props.flash?.success);
const flashError = computed(() => page.props.flash?.error);
</script>

<template>
    <AuthAndesShell
        title="Confirme seu e-mail"
        subtitle="Enviamos um link de confirmação para o endereço abaixo."
        banner-title="Falta confirmar o e-mail."
        banner-text="É o que garante que os avisos de venda chegam até você."
        :facts="[]"
    >
        <template #topbar-end>
            <Link
                href="/logout"
                method="post"
                as="button"
                class="andes-ui-button andes-ui-button--quiet andes-ui-button--medium"
            >
                Usar outro e-mail
            </Link>
        </template>

        <div class="andes-auth__figure">
            <span class="andes-ui-thumbnail andes-ui-thumbnail--huge andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                <AndesIcon name="bell" />
            </span>
            <span class="andes-ui-typography tp-body-small c-secondary">Abra o e-mail enviado para</span>
            <b class="andes-ui-typography tp-heading-medium">{{ email }}</b>
        </div>

        <div v-if="flashSuccess" class="andes-ui-message andes-ui-message--positive andes-auth__alert">
            <span class="andes-ui-message__text">{{ flashSuccess }}</span>
        </div>
        <div v-if="flashError" class="andes-ui-message andes-ui-message--negative andes-auth__alert">
            <span class="andes-ui-message__text">{{ flashError }}</span>
        </div>

        <form class="andes-auth__form" @submit.prevent="submitResend">
            <button
                type="submit"
                class="andes-ui-button andes-ui-button--loud andes-ui-button--large andes-ui-button--full-width"
                :disabled="!canResend"
            >
                {{ resendButtonLabel }}
            </button>
            <p class="andes-ui-typography tp-body-small c-secondary" style="text-align:center">
                Aguarde {{ resend_cooldown_seconds }} segundos entre cada reenvio. Máximo de 5 por hora.
            </p>
        </form>

        <template #footer>
            <LegalFooterLinks />
        </template>
    </AuthAndesShell>
</template>
