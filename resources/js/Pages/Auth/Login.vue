<script setup>
/**
 * Entrar — o desenho de `/root/design system guide/login-nova`. A casca (fundo,
 * cartão, faixa, rodapé) e todo o CSS moram em `AuthPlataformaShell`, que o
 * cadastro também usa: uma folha só, uma foto só.
 *
 * A fiação:
 *  - o `fakeRequest` do protótipo virou o POST /login de verdade (Inertia, com
 *    CSRF e sessão), e quem manda na mensagem de erro é sempre o servidor;
 *  - a validação no navegador é conforto, nunca autorização — o servidor
 *    valida de novo e a rota tem `throttle:login`;
 *  - o "Lembrar de mim" liga no remember-me do Laravel (cookie assinado), e o
 *    espelho do e-mail em localStorage do protótipo saiu: em máquina
 *    compartilhada ele entrega a conta de quem entrou por último.
 */
import { ref, computed, reactive } from 'vue';
import { Link, useForm, usePage, router } from '@inertiajs/vue3';
import AuthPlataformaShell from '@/components/auth/AuthPlataformaShell.vue';
import AuthTurnstileField from '@/components/auth/AuthTurnstileField.vue';

const props = defineProps({
    login_turnstile: { type: Object, default: () => ({ enabled: false, site_key: '' }) },
});

const page = usePage();
const flashError = computed(() => page.props.flash?.error ?? null);
const demoMode = computed(() => page.props.demo_mode ?? {});

const form = useForm({
    email: '',
    password: '',
    remember: false,
    turnstile_token: '',
});

const showPassword = ref(false);
const turnstileToken = ref('');
const turnstileActive = computed(
    () => Boolean(props.login_turnstile?.enabled && props.login_turnstile?.site_key)
);

/* Erros do navegador: conforto de digitação. Os do servidor mandam. */
const localErrors = reactive({ email: '', password: '' });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const emailError = computed(() => localErrors.email || form.errors.email || '');
const passwordError = computed(() => localErrors.password || form.errors.password || '');

function validateEmail() {
    const v = form.email.trim();
    if (!v) { localErrors.email = 'Informe seu e-mail.'; return false; }
    if (!EMAIL_RE.test(v)) { localErrors.email = 'E-mail inválido.'; return false; }
    localErrors.email = '';
    return true;
}

function validatePassword() {
    if (!form.password) { localErrors.password = 'Informe sua senha.'; return false; }
    if (form.password.length < 6) { localErrors.password = 'Mínimo de 6 caracteres.'; return false; }
    localErrors.password = '';
    return true;
}

/* Volta a digitar, some o erro — o do navegador e o que veio do servidor */
function clearError(fieldName) {
    localErrors[fieldName] = '';
    if (form.errors[fieldName]) {
        form.clearErrors(fieldName);
    }
}

const emailInput = ref(null);
const passwordInput = ref(null);

/** Nota do rodapé do formulário: erro do servidor ou do desafio de segurança. */
const formNote = computed(() => {
    if (form.errors.turnstile_token) return form.errors.turnstile_token;
    if (flashError.value) return flashError.value;
    return '';
});

const submitBlocked = computed(() => form.processing || (turnstileActive.value && !turnstileToken.value));

function submit() {
    const okEmail = validateEmail();
    const okPass = validatePassword();
    if (!okEmail || !okPass) {
        (okEmail ? passwordInput.value : emailInput.value)?.focus();
        return;
    }

    if (turnstileActive.value && !turnstileToken.value) {
        form.setError('turnstile_token', 'Aguarde a verificação de segurança ou recarregue a página.');
        return;
    }

    form.turnstile_token = turnstileToken.value;
    form.transform((data) => ({
        ...data,
        email: String(data.email || '').trim(),
        turnstile_token: turnstileToken.value || data.turnstile_token || '',
    })).post('/login', {
        onFinish: () => form.reset('password'),
    });
}

/* ------------------------------------------------------------------- ripple */
const submitBtn = ref(null);
const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ripple(event) {
    const btn = submitBtn.value;
    if (!btn || reduceMotion) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const el = document.createElement('span');
    el.className = 'ripple';
    el.style.width = el.style.height = `${size}px`;
    el.style.left = `${event.clientX - r.left}px`;
    el.style.top = `${event.clientY - r.top}px`;
    btn.appendChild(el);
    setTimeout(() => el.remove(), 600);
}

/* ------------------------------------------------------------- demonstração */
const demoBusy = ref(false);
function loginDemo(role) {
    demoBusy.value = true;
    router.post(role === 'admin' ? '/demo/login/admin' : '/demo/login/seller', {}, {
        onFinish: () => { demoBusy.value = false; },
    });
}
</script>

<template>
    <AuthPlataformaShell
        page-title="Entrar"
        description="Acesse sua conta para acompanhar vendas, produtos e saldo."
        badge="Nova temporada de vendas"
    >
        <h1 class="title">Entrar</h1>
        <p class="subtitle">Acesse sua conta para acompanhar vendas, produtos e saldo.</p>

        <form novalidate @submit.prevent="submit">
            <div class="field" :class="{ 'has-error': emailError }">
                <label for="email">E-mail</label>
                <div class="input-wrap">
                    <svg class="input-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 6h16v12H4z" /><path d="m4 7 8 6 8-6" />
                    </svg>
                    <input
                        id="email"
                        ref="emailInput"
                        v-model="form.email"
                        type="email"
                        name="email"
                        autocomplete="email"
                        placeholder="voce@email.com"
                        required
                        :aria-invalid="emailError ? 'true' : undefined"
                        @input="clearError('email')"
                        @blur="form.email && validateEmail()"
                    />
                </div>
                <span class="error" :class="{ 'is-visible': emailError }">{{ emailError }}</span>
            </div>

            <div class="field" :class="{ 'has-error': passwordError }">
                <label for="password">Senha</label>
                <div class="input-wrap">
                    <svg class="input-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                    <input
                        id="password"
                        ref="passwordInput"
                        v-model="form.password"
                        :type="showPassword ? 'text' : 'password'"
                        name="password"
                        autocomplete="current-password"
                        placeholder="••••••••"
                        required
                        minlength="6"
                        :aria-invalid="passwordError ? 'true' : undefined"
                        @input="clearError('password')"
                    />
                    <button
                        type="button"
                        class="toggle-pass"
                        :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
                        :aria-pressed="showPassword ? 'true' : 'false'"
                        @click="showPassword = !showPassword"
                    >
                        <svg class="eye" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                            <circle cx="12" cy="12" r="2.8" />
                        </svg>
                        <svg class="eye-off" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M2 12s3.6-6.5 10-6.5c2 0 3.7.5 5.1 1.3M22 12s-3.6 6.5-10 6.5c-2 0-3.7-.5-5.1-1.3" />
                            <path d="m3 3 18 18" />
                        </svg>
                    </button>
                </div>
                <span class="error" :class="{ 'is-visible': passwordError }">{{ passwordError }}</span>
            </div>

            <div class="row">
                <label class="check">
                    <input v-model="form.remember" type="checkbox" name="remember" />
                    <span class="box" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                    </span>
                    <span class="check-label">Lembrar de mim</span>
                </label>
                <Link class="link" href="/esqueci-senha">Esqueci a senha</Link>
            </div>

            <AuthTurnstileField
                v-if="turnstileActive"
                v-model="turnstileToken"
                class="turnstile"
                :config="login_turnstile"
            />

            <button
                ref="submitBtn"
                type="submit"
                class="btn"
                :class="{ 'is-loading': form.processing }"
                :disabled="submitBlocked"
                @pointerdown="ripple"
            >
                <span class="btn__label">
                    {{ turnstileActive && !turnstileToken ? 'Aguardando verificação…' : 'Entrar' }}
                </span>
                <span class="btn__spinner" aria-hidden="true"></span>
            </button>

            <p class="form-note" :class="{ 'is-error': formNote }" role="status" aria-live="polite">{{ formNote }}</p>
        </form>

        <div v-if="demoMode.enabled" class="demo">
            <p class="demo__note">Demonstração — ambiente somente leitura, sem alterar dados reais.</p>
            <div class="demo__actions">
                <button type="button" class="btn btn--ghost" :disabled="demoBusy || !demoMode.admin_label" @click="loginDemo('admin')">
                    Entrar como admin
                </button>
                <button type="button" class="btn btn--ghost" :disabled="demoBusy || !demoMode.seller_label" @click="loginDemo('seller')">
                    Entrar como infoprodutor
                </button>
            </div>
        </div>

        <p class="signup">Ainda não tem conta? <Link class="link" href="/cadastro">Criar conta</Link></p>
    </AuthPlataformaShell>
</template>
