<script setup>
/**
 * Criar conta — mesma casca da tela de entrar (`AuthPlataformaShell`): mesma foto
 * de fundo, mesmo cartão de vidro, mesma folha de estilo. O passo a passo, as
 * validações de CPF/CNPJ, a consulta de CEP e o envio continuam os mesmos; o
 * que mudou é a roupa, que saiu do template antigo (`AuthPageShell` +
 * `useLoginTemplate`) para o desenho novo.
 */
import { ref, computed, watch, onMounted } from 'vue';
import { useForm, Link, usePage } from '@inertiajs/vue3';
import AuthPlataformaShell from '@/components/auth/AuthPlataformaShell.vue';
import AuthTurnstileField from '@/components/auth/AuthTurnstileField.vue';

const page = usePage();

const props = defineProps({
    revenue_ranges: { type: Array, default: () => [] },
    coproducer_invite: { type: String, default: '' },
    upgrade_from_customer: { type: Boolean, default: false },
    registration_turnstile: { type: Object, default: () => ({ enabled: false, site_key: '' }) },
});

const step = ref(1);
const totalSteps = 5;
const emailCheckMsg = ref('');
const cepLoading = ref(false);
/** Aviso informativo após consulta ViaCEP (não bloqueia; endereço pode ser manual). */
const cepLookupHint = ref('');
let cepFetchTimer = null;
let cepAbortController = null;
/** Erro de validação apenas do passo atual (avanço Continuar / Enter). */
const wizardStepError = ref('');

function digitsOnly(s) {
    return String(s || '').replace(/\D/g, '');
}

/** Mesma lógica que `App\Support\BrazilianDocuments` (dígitos verificadores). */
function isValidCpfJs(d) {
    const cpf = digitsOnly(d);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    for (let t = 9; t < 11; t++) {
        let sum = 0;
        for (let i = 0; i < t; i++) {
            sum += parseInt(cpf[i], 10) * (t + 1 - i);
        }
        let r = (sum * 10) % 11;
        if (r === 10) {
            r = 0;
        }
        if (r !== parseInt(cpf[t], 10)) {
            return false;
        }
    }
    return true;
}

function isValidCnpjJs(d) {
    const cnpj = digitsOnly(d);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
        return false;
    }
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cnpj[i], 10) * w1[i];
    }
    let r = sum % 11;
    const dv1 = r < 2 ? 0 : 11 - r;
    if (dv1 !== parseInt(cnpj[12], 10)) {
        return false;
    }
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
        sum += parseInt(cnpj[i], 10) * w2[i];
    }
    r = sum % 11;
    const dv2 = r < 2 ? 0 : 11 - r;
    return dv2 === parseInt(cnpj[13], 10);
}

function isAdultBirthDate(dateStr) {
    if (!dateStr) {
        return false;
    }
    const d = new Date(`${dateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) {
        return false;
    }
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - 18);
    return d <= limit;
}

function isValidEmailFormat(email) {
    const e = String(email || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * Valida só o passo atual. Retorna true se pode avançar ou enviar.
 * Passo 1 consulta o e-mail no servidor (evita avançar sem blur no campo).
 */
async function validateCurrentStep() {
    wizardStepError.value = '';
    const s = step.value;

    if (s === 1) {
        if (!String(form.name || '').trim()) {
            wizardStepError.value = 'Informe seu nome completo.';
            return false;
        }
        if (!isValidEmailFormat(form.email)) {
            wizardStepError.value = 'Informe um e-mail válido.';
            return false;
        }
        if (!form.birth_date) {
            wizardStepError.value = 'Informe a data de nascimento.';
            return false;
        }
        if (!isAdultBirthDate(form.birth_date)) {
            wizardStepError.value = 'É necessário ter pelo menos 18 anos.';
            return false;
        }
        const email = String(form.email || '').trim();
        try {
            const res = await window.axios.post('/cadastro/validar-email', { email });
            if (!res.data?.available) {
                emailCheckMsg.value = 'Este e-mail já está em uso.';
                wizardStepError.value = 'Este e-mail já está em uso. Escolha outro.';
                return false;
            }
            emailCheckMsg.value = '';
        } catch {
            /* não bloqueia se a checagem falhar (rede); o backend valida no POST final */
        }
        return true;
    }

    if (s === 2) {
        const doc = digitsOnly(form.document);
        if (form.person_type === 'pf') {
            if (!isValidCpfJs(doc)) {
                wizardStepError.value = 'CPF inválido. Confira os números.';
                return false;
            }
        } else {
            if (!isValidCnpjJs(doc)) {
                wizardStepError.value = 'CNPJ inválido. Confira os números.';
                return false;
            }
            if (!String(form.company_name || '').trim()) {
                wizardStepError.value = 'Informe a razão social.';
                return false;
            }
            const rep = digitsOnly(form.legal_representative_cpf);
            if (!isValidCpfJs(rep)) {
                wizardStepError.value = 'CPF do representante legal inválido.';
                return false;
            }
        }
        try {
            const payload = {
                person_type: form.person_type,
                document: doc,
                legal_representative_cpf: form.person_type === 'pj' ? digitsOnly(form.legal_representative_cpf) : null,
            };
            const res = await window.axios.post('/cadastro/validar-documento', payload);
            if (!res.data?.available) {
                wizardStepError.value = res.data?.message || 'Documento não disponível para cadastro.';
                return false;
            }
        } catch (e) {
            const msg = e.response?.data?.message;
            if (msg) {
                wizardStepError.value = msg;
                return false;
            }
            /* rede: não bloqueia; o servidor valida de novo no POST */
        }
        return true;
    }

    if (s === 3) {
        const cep = digitsOnly(form.address_zip);
        if (cep.length !== 8) {
            wizardStepError.value = 'Informe o CEP com 8 dígitos.';
            return false;
        }
        if (!String(form.address_street || '').trim()) {
            wizardStepError.value = 'Informe o logradouro.';
            return false;
        }
        if (!String(form.address_number || '').trim()) {
            wizardStepError.value = 'Informe o número.';
            return false;
        }
        if (!String(form.address_neighborhood || '').trim()) {
            wizardStepError.value = 'Informe o bairro.';
            return false;
        }
        if (!String(form.address_city || '').trim()) {
            wizardStepError.value = 'Informe a cidade.';
            return false;
        }
        const uf = String(form.address_state || '').trim().toUpperCase();
        if (uf.length !== 2) {
            wizardStepError.value = 'Informe a UF com 2 letras.';
            return false;
        }
        return true;
    }

    if (s === 4) {
        if (!form.monthly_revenue_range) {
            wizardStepError.value = 'Selecione uma faixa de faturamento mensal.';
            return false;
        }
        return true;
    }

    if (s === 5) {
        const pwd = String(form.password || '');
        const conf = String(form.password_confirmation || '');
        if (pwd.length < 8) {
            wizardStepError.value = 'A senha deve ter no mínimo 8 caracteres.';
            return false;
        }
        if (pwd !== conf) {
            wizardStepError.value = 'A confirmação da senha não confere.';
            return false;
        }
        if (!form.accept_terms_privacy) {
            wizardStepError.value = 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.';
            return false;
        }
        return true;
    }

    return true;
}

watch(step, () => {
    wizardStepError.value = '';
});

const turnstileToken = ref('');

const form = useForm({
    person_type: 'pf',
    name: '',
    email: '',
    coproducer_invite: props.coproducer_invite || '',
    birth_date: '',
    document: '',
    company_name: '',
    legal_representative_cpf: '',
    address_zip: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    monthly_revenue_range: '',
    password: '',
    password_confirmation: '',
    accept_terms_privacy: false,
    turnstile_token: '',
    website: '',
});

onMounted(() => {
    if (!props.upgrade_from_customer) return;
    const u = page.props.auth?.user;
    if (!u) return;
    if (!String(form.name || '').trim()) {
        form.name = u.name || '';
    }
    if (!String(form.email || '').trim()) {
        form.email = u.email || '';
    }
});

const stepTitle = computed(() => {
    const titles = {
        1: 'Dados básicos',
        2: form.person_type === 'pf' ? 'CPF' : 'CNPJ e empresa',
        3: 'Endereço',
        4: 'Faturamento mensal',
        5: 'Senha',
    };
    return titles[step.value] ?? '';
});

const progressPct = computed(() => (step.value / totalSteps) * 100);

watch(
    () => form.email,
    () => {
        emailCheckMsg.value = '';
    }
);

async function checkEmailBlur() {
    const email = (form.email || '').trim();
    if (!email || !email.includes('@')) return;
    try {
        const res = await window.axios.post('/cadastro/validar-email', { email });
        emailCheckMsg.value = res.data?.available
            ? ''
            : (res.data?.message || 'Este e-mail já está em uso.');
    } catch {
        emailCheckMsg.value = '';
    }
}

async function fetchCep() {
    const raw = digitsOnly(form.address_zip);
    if (raw.length !== 8) {
        cepLookupHint.value = '';
        return;
    }
    cepAbortController?.abort();
    const controller = new AbortController();
    cepAbortController = controller;
    cepLoading.value = true;
    cepLookupHint.value = '';
    try {
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
            cepLookupHint.value =
                'Não foi possível consultar o CEP. Verifique o número ou preencha logradouro, bairro, cidade e UF manualmente.';
            return;
        }
        const d = await res.json().catch(() => null);
        if (!d || d.erro) {
            cepLookupHint.value =
                'CEP não encontrado na base dos Correios. Confira os dígitos ou preencha o endereço manualmente.';
            return;
        }
        form.address_street = d.logradouro != null ? String(d.logradouro) : '';
        form.address_neighborhood = d.bairro != null ? String(d.bairro) : '';
        form.address_city = d.localidade != null ? String(d.localidade) : '';
        form.address_state = d.uf ? String(d.uf).toUpperCase().slice(0, 2) : '';
        const hasStreet = !!(d.logradouro && String(d.logradouro).trim());
        const hasNbhd = !!(d.bairro && String(d.bairro).trim());
        const hasCity = !!(d.localidade && String(d.localidade).trim());
        if (!hasStreet || !hasNbhd || !hasCity) {
            cepLookupHint.value =
                'Alguns dados não vieram na consulta. Complete logradouro, bairro e cidade manualmente, se necessário.';
        } else {
            cepLookupHint.value = 'Endereço preenchido automaticamente. Ajuste se precisar.';
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            return;
        }
        cepLookupHint.value =
            'Não foi possível consultar o CEP agora. Preencha o endereço manualmente ou tente de novo em instantes.';
    } finally {
        cepLoading.value = false;
    }
}

watch(
    () => digitsOnly(form.address_zip),
    (digits) => {
        if (digits.length !== 8) {
            cepLookupHint.value = '';
            clearTimeout(cepFetchTimer);
            return;
        }
        clearTimeout(cepFetchTimer);
        cepFetchTimer = setTimeout(() => {
            fetchCep();
        }, 400);
    }
);

function maskCpfCnpj(v) {
    const d = String(v).replace(/\D/g, '');
    if (form.person_type === 'pf') {
        return d
            .slice(0, 11)
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return d
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskCpf(v) {
    const d = String(v).replace(/\D/g, '').slice(0, 11);
    return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskCep(v) {
    const d = String(v).replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function prevStep() {
    if (step.value > 1) step.value -= 1;
}

/** Nomes curtos dos passos — servem ao cabeçalho e ao roteiro da faixa. */
const stepNames = ['Dados básicos', 'Documento', 'Endereço', 'Faturamento', 'Senha'];

const showPassword = ref(false);

/* Ripple do botão, igual ao da tela de entrar */
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

function nextStep() {
    if (step.value < totalSteps) {
        step.value += 1;
    }
}

/** HTML5 `required` em etapas ocultas bloqueava o submit antes de chegar na etapa da senha. */
async function onWizardSubmit() {
    if (step.value === totalSteps) {
        if (!(await validateCurrentStep())) {
            return;
        }
        submitRegistration();
        return;
    }
    if (!(await validateCurrentStep())) {
        return;
    }
    nextStep();
}

/** Enter nos passos 1–4 avança (com validação); no passo 5 o Enter submete o formulário. */
async function onWizardKeydownEnter(e) {
    if (step.value >= totalSteps) {
        return;
    }
    if (e.target.tagName === 'TEXTAREA') {
        return;
    }
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'button' || e.target.closest?.('button')) {
        return;
    }
    e.preventDefault();
    if (!(await validateCurrentStep())) {
        return;
    }
    nextStep();
}

/**
 * Campos de cada passo — serve para levar o usuário de volta ao passo do erro.
 * Sem isso, um erro que só o servidor pega (documento já cadastrado, por
 * exemplo) volta com o wizard no passo 5 e a mensagem fica num `v-show`
 * fechado: o botão não funciona e nada explica por quê.
 */
const STEP_FIELDS = {
    1: ['name', 'email', 'birth_date'],
    2: ['document', 'company_name', 'legal_representative_cpf', 'person_type'],
    3: ['address_zip', 'address_street', 'address_number', 'address_complement', 'address_neighborhood', 'address_city', 'address_state'],
    4: ['monthly_revenue_range'],
    5: ['password', 'password_confirmation', 'accept_terms_privacy', 'turnstile_token'],
};

function goToFirstErrorStep(errors) {
    const keys = Object.keys(errors || {});
    if (!keys.length) return;
    for (let n = 1; n <= totalSteps; n += 1) {
        if (STEP_FIELDS[n].some((field) => keys.includes(field))) {
            /* só troca o passo: a mensagem já sai no `.error` do campo, e o
               watcher de `step` limparia qualquer aviso posto aqui. */
            step.value = n;
            return;
        }
    }
}

function submitRegistration() {
    form.turnstile_token = turnstileToken.value;
    form
        .transform((data) => ({
            ...data,
            turnstile_token: turnstileToken.value || data.turnstile_token || '',
            coproducer_invite: data.coproducer_invite || null,
            document: String(data.document || '').replace(/\D/g, ''),
            legal_representative_cpf: data.person_type === 'pj' ? String(data.legal_representative_cpf || '').replace(/\D/g, '') : null,
            address_zip: String(data.address_zip || '').replace(/\D/g, ''),
            address_state: String(data.address_state || '').toUpperCase().slice(0, 2),
        }))
        .post('/cadastro', {
            preserveScroll: true,
            onError: (errors) => goToFirstErrorStep(errors),
        });
}
</script>

<template>
    <AuthPlataformaShell
        page-title="Criar conta"
        description="Crie sua conta para vender, acompanhar pedidos e receber."
        badge="Leva 2 minutos"
        headline="Comece a vender hoje"
        support="Rápido, seguro e sem complicação. Sua conta fica pronta em minutos."
        wide
    >
        <template #glass-extra>
            <ol class="glass-steps">
                <li
                    v-for="(name, i) in stepNames"
                    :key="name"
                    :class="{ 'is-current': step === i + 1, 'is-done': step > i + 1 }"
                >
                    <i aria-hidden="true">{{ step > i + 1 ? '✓' : i + 1 }}</i>
                    {{ name }}
                </li>
            </ol>
        </template>

        <h1 class="title">Criar conta</h1>
        <p class="subtitle">Rápido, seguro e sem complicação.</p>

        <div class="steps-head">
            <span>Etapa {{ step }} de {{ totalSteps }}</span>
            <b>{{ stepTitle }}</b>
        </div>
        <div class="steps-bar"><i :style="{ width: progressPct + '%' }" /></div>

        <form novalidate @submit.prevent="onWizardSubmit" @keydown.enter="onWizardKeydownEnter">
            <!-- Armadilha para robô: fica fora da tela e o servidor recusa se vier preenchida -->
            <div class="trap" aria-hidden="true">
                <label for="registration-website">Website</label>
                <input id="registration-website" v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" />
            </div>

            <!-- ================= Passo 1 — dados básicos ================= -->
            <div v-show="step === 1" class="wizard-step">
                <div class="picker">
                    <button type="button" :class="{ 'is-on': form.person_type === 'pf' }" @click="form.person_type = 'pf'">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
                        </svg>
                        <b>Pessoa física</b>
                        <span>Cadastro com CPF</span>
                    </button>
                    <button type="button" :class="{ 'is-on': form.person_type === 'pj' }" @click="form.person_type = 'pj'">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 21V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15" /><path d="M15 10h3a2 2 0 0 1 2 2v9" />
                            <path d="M8 8h3M8 12h3M8 16h3" /><path d="M3 21h18" />
                        </svg>
                        <b>Pessoa jurídica</b>
                        <span>Cadastro com CNPJ</span>
                    </button>
                </div>

                <div class="field" :class="{ 'has-error': form.errors.name }">
                    <label for="reg-name">Nome completo</label>
                    <div class="input-wrap input-wrap--plain">
                        <input id="reg-name" v-model="form.name" type="text" autocomplete="name" placeholder="Como está no documento" required />
                    </div>
                    <span class="error" :class="{ 'is-visible': form.errors.name }">{{ form.errors.name }}</span>
                </div>

                <div class="field" :class="{ 'has-error': form.errors.email }">
                    <label for="reg-email">E-mail</label>
                    <div class="input-wrap input-wrap--plain">
                        <input
                            id="reg-email"
                            v-model="form.email"
                            type="email"
                            autocomplete="email"
                            placeholder="voce@email.com"
                            required
                            @blur="checkEmailBlur"
                        />
                    </div>
                    <p v-if="emailCheckMsg" class="hint is-warn">{{ emailCheckMsg }}</p>
                    <p v-else class="hint">Ao continuar, verificamos se o e-mail já está em uso.</p>
                    <span class="error" :class="{ 'is-visible': form.errors.email }">{{ form.errors.email }}</span>
                </div>

                <div class="field" :class="{ 'has-error': form.errors.birth_date }">
                    <label for="reg-birth">Data de nascimento</label>
                    <div class="input-wrap input-wrap--plain">
                        <input id="reg-birth" v-model="form.birth_date" type="date" required />
                    </div>
                    <p class="hint">Usamos apenas para validação cadastral e conformidade.</p>
                    <span class="error" :class="{ 'is-visible': form.errors.birth_date }">{{ form.errors.birth_date }}</span>
                </div>
            </div>

            <!-- ================= Passo 2 — documento ================= -->
            <div v-show="step === 2" class="wizard-step">
                <div class="field" :class="{ 'has-error': form.errors.document }">
                    <label for="reg-doc">{{ form.person_type === 'pf' ? 'CPF' : 'CNPJ' }}</label>
                    <div class="input-wrap input-wrap--plain">
                        <input
                            id="reg-doc"
                            :value="form.document"
                            type="text"
                            inputmode="numeric"
                            :placeholder="form.person_type === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'"
                            required
                            @input="form.document = maskCpfCnpj($event.target.value)"
                        />
                    </div>
                    <span class="error" :class="{ 'is-visible': form.errors.document }">{{ form.errors.document }}</span>
                </div>

                <template v-if="form.person_type === 'pj'">
                    <div class="field" :class="{ 'has-error': form.errors.company_name }">
                        <label for="reg-company">Razão social</label>
                        <div class="input-wrap input-wrap--plain">
                            <input id="reg-company" v-model="form.company_name" type="text" placeholder="Nome registrado da empresa" />
                        </div>
                        <span class="error" :class="{ 'is-visible': form.errors.company_name }">{{ form.errors.company_name }}</span>
                    </div>

                    <div class="field" :class="{ 'has-error': form.errors.legal_representative_cpf }">
                        <label for="reg-rep">CPF do representante legal</label>
                        <div class="input-wrap input-wrap--plain">
                            <input
                                id="reg-rep"
                                :value="form.legal_representative_cpf"
                                type="text"
                                inputmode="numeric"
                                placeholder="000.000.000-00"
                                @input="form.legal_representative_cpf = maskCpf($event.target.value)"
                            />
                        </div>
                        <span class="error" :class="{ 'is-visible': form.errors.legal_representative_cpf }">{{ form.errors.legal_representative_cpf }}</span>
                    </div>
                </template>
            </div>

            <!-- ================= Passo 3 — endereço ================= -->
            <div v-show="step === 3" class="wizard-step">
                <div class="field" :class="{ 'has-error': form.errors.address_zip }">
                    <label for="reg-zip">CEP</label>
                    <div class="input-wrap input-wrap--plain">
                        <input
                            id="reg-zip"
                            :value="form.address_zip"
                            type="text"
                            inputmode="numeric"
                            placeholder="00000-000"
                            autocomplete="postal-code"
                            @input="form.address_zip = maskCep($event.target.value)"
                            @blur="fetchCep"
                        />
                    </div>
                    <p v-if="cepLoading" class="hint">Buscando endereço…</p>
                    <p v-else-if="cepLookupHint" class="hint">{{ cepLookupHint }}</p>
                    <span class="error" :class="{ 'is-visible': form.errors.address_zip }">{{ form.errors.address_zip }}</span>
                </div>

                <div class="field" :class="{ 'has-error': form.errors.address_street }">
                    <label for="reg-street">Logradouro</label>
                    <div class="input-wrap input-wrap--plain">
                        <input id="reg-street" v-model="form.address_street" type="text" autocomplete="address-line1" />
                    </div>
                    <span class="error" :class="{ 'is-visible': form.errors.address_street }">{{ form.errors.address_street }}</span>
                </div>

                <div class="pair">
                    <div class="field">
                        <label for="reg-number">Número</label>
                        <div class="input-wrap input-wrap--plain">
                            <input id="reg-number" v-model="form.address_number" type="text" />
                        </div>
                    </div>
                    <div class="field">
                        <label for="reg-comp">Complemento</label>
                        <div class="input-wrap input-wrap--plain">
                            <input id="reg-comp" v-model="form.address_complement" type="text" placeholder="Opcional" />
                        </div>
                    </div>
                </div>

                <div class="field">
                    <label for="reg-nbhd">Bairro</label>
                    <div class="input-wrap input-wrap--plain">
                        <input id="reg-nbhd" v-model="form.address_neighborhood" type="text" />
                    </div>
                </div>

                <div class="pair pair--tight">
                    <div class="field">
                        <label for="reg-city">Cidade</label>
                        <div class="input-wrap input-wrap--plain">
                            <input id="reg-city" v-model="form.address_city" type="text" />
                        </div>
                    </div>
                    <div class="field">
                        <label for="reg-uf">UF</label>
                        <div class="input-wrap input-wrap--plain">
                            <input id="reg-uf" v-model="form.address_state" type="text" maxlength="2" style="text-transform: uppercase" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- ================= Passo 4 — faturamento ================= -->
            <div v-show="step === 4" class="wizard-step">
                <p class="subtitle">Faturamento mensal estimado. Ajuda a personalizar sua experiência — escolha a faixa mais próxima da realidade do negócio.</p>
                <div class="options">
                    <label
                        v-for="opt in revenue_ranges"
                        :key="opt.value"
                        :class="{ 'is-on': form.monthly_revenue_range === opt.value }"
                    >
                        <input v-model="form.monthly_revenue_range" type="radio" :value="opt.value" />
                        <span>{{ opt.label }}</span>
                        <i aria-hidden="true" />
                    </label>
                </div>
                <span class="error" :class="{ 'is-visible': form.errors.monthly_revenue_range }">{{ form.errors.monthly_revenue_range }}</span>
            </div>

            <!-- ================= Passo 5 — senha ================= -->
            <div v-show="step === 5" class="wizard-step">
                <div class="field" :class="{ 'has-error': form.errors.password }">
                    <label for="reg-pass">Senha</label>
                    <div class="input-wrap">
                        <svg class="input-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                        <input
                            id="reg-pass"
                            v-model="form.password"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="new-password"
                            placeholder="Mínimo de 8 caracteres"
                            required
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
                    <span class="error" :class="{ 'is-visible': form.errors.password }">{{ form.errors.password }}</span>
                </div>

                <div class="field">
                    <label for="reg-pass2">Confirmar senha</label>
                    <div class="input-wrap">
                        <svg class="input-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                        <input
                            id="reg-pass2"
                            v-model="form.password_confirmation"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="new-password"
                            placeholder="Repita a senha"
                            required
                        />
                    </div>
                </div>

                <label class="check check--block">
                    <input v-model="form.accept_terms_privacy" type="checkbox" />
                    <span class="box" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                    </span>
                    <span class="check-label">
                        Li e aceito os
                        <a class="link" href="/termos-de-uso" target="_blank" rel="noopener">Termos de Uso</a>
                        e a
                        <a class="link" href="/politica-privacidade" target="_blank" rel="noopener">Política de Privacidade</a>.
                    </span>
                </label>
                <span class="error" :class="{ 'is-visible': form.errors.accept_terms_privacy }">{{ form.errors.accept_terms_privacy }}</span>

                <AuthTurnstileField
                    v-if="registration_turnstile?.enabled && registration_turnstile?.site_key"
                    v-model="turnstileToken"
                    class="turnstile"
                    :config="registration_turnstile"
                    :error="form.errors.turnstile_token"
                />
            </div>

            <p v-if="wizardStepError" class="alert" role="alert">{{ wizardStepError }}</p>

            <div class="wizard-actions">
                <button v-if="step > 1" type="button" class="btn btn--ghost" @click="prevStep">Voltar</button>
                <button
                    ref="submitBtn"
                    type="submit"
                    class="btn"
                    :class="{ 'is-loading': form.processing }"
                    :disabled="form.processing"
                    @pointerdown="ripple"
                >
                    <span class="btn__label">{{ step === totalSteps ? 'Criar conta' : 'Continuar' }}</span>
                    <span class="btn__spinner" aria-hidden="true"></span>
                </button>
            </div>
        </form>

        <p class="signup">Já tem conta? <Link class="link" href="/login">Entrar</Link></p>
    </AuthPlataformaShell>
</template>
