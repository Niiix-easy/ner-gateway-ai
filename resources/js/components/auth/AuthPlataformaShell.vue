<script setup>
/**
 * Casca das telas públicas de conta (entrar e criar conta) — o desenho de
 * `/root/design system guide/login-nova`: foto noturna de fundo, cartão com
 * véu de vidro em uma camada só, formulário à esquerda e a faixa de marca à
 * direita.
 *
 * Uma casca só para as duas telas: mesmo CSS, mesma foto, mesmo pedaço de
 * bundle. Por isso o estilo aqui **não** é `scoped` — o formulário de cada
 * página entra por slot e slot é compilado no escopo da página, não no do
 * componente. Em troca, tudo mora debaixo de `.brand-auth`, que é o que
 * impede nomes genéricos (`.card`, `.btn`, `.field`, `.row`, `.link`) de
 * vazarem para o resto do app.
 */
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { Head, Link } from '@inertiajs/vue3';
import { useAuthBranding } from '@/composables/useAuthBranding';
import { useAuthTheme } from '@/composables/useAuthTheme';
import CookieConsentBanner from '@/components/legal/CookieConsentBanner.vue';

const props = defineProps({
    /** Vai para o <title> como "{marca} — {pageTitle}" */
    pageTitle: { type: String, default: '' },
    description: { type: String, default: '' },
    /** Selo no alto da faixa */
    badge: { type: String, default: '' },
    /** Chamada da faixa; a última palavra sai no serif itálico */
    headline: { type: String, default: '' },
    /** Apoio da faixa */
    support: { type: String, default: '' },
    /** Coluna do formulário mais larga — para o cadastro, que tem mais campos */
    wide: { type: Boolean, default: false },
});

useAuthTheme();
const { appName, logoDark, heroTagline, heroSubtagline } = useAuthBranding();

/* A última palavra da chamada vai no serif itálico — é o desenho da faixa.
   Com `text-wrap: balance` no título, a frase cai em duas linhas parelhas sem
   precisar de <br> cravado, e continua certa com o texto de outra marca. */
const hero = computed(() => {
    const raw = String(props.headline || heroTagline.value || '').trim().replace(/[.!…]+$/, '');
    const parts = raw.split(/\s+/).filter(Boolean);
    const last = parts.pop() || '';
    return { head: parts.join(' '), last };
});

const supportText = computed(() => props.support || heroSubtagline.value);
const year = new Date().getFullYear();

/* O fundo da tela é o da arte, não o do app: pinta o body para o overscroll
   não mostrar uma faixa clara nas pontas. */
onMounted(() => document.body.classList.add('brand-auth-body'));
onBeforeUnmount(() => document.body.classList.remove('brand-auth-body'));
</script>

<template>
    <Head>
        <title>{{ pageTitle ? `${appName} — ${pageTitle}` : appName }}</title>
        <meta v-if="description" name="description" :content="description" />
    </Head>

    <div class="brand-auth">
        <!-- ===== FUNDO ===== -->
        <div class="bg" aria-hidden="true">
            <div class="bg__image"></div>
            <div class="bg__vignette"></div>
            <div class="bg__grain"></div>
        </div>

        <!-- ===== TOPO ===== -->
        <header class="topbar">
            <Link class="brand" href="/login" :aria-label="appName">
                <img :src="logoDark" :alt="appName" />
            </Link>
            <slot name="topbar-end" />
        </header>

        <!-- ===== CONTEÚDO ===== -->
        <main class="stage">
            <section class="card" :class="{ 'card--wide': wide }">
                <!-- Camada ÚNICA de superfície: vidro + degradê escuro. -->
                <div class="card__veil" aria-hidden="true"></div>

                <!-- Painel do formulário (sólido → some no meio) -->
                <div class="card__form">
                    <div class="form-inner">
                        <slot />
                    </div>
                </div>

                <!-- Painel de boas-vindas (vidro que mescla com o cenário) -->
                <div class="card__glass">
                    <div class="glass-content">
                        <span v-if="badge" class="badge">
                            <i class="badge__dot" aria-hidden="true"></i>
                            {{ badge }}
                        </span>

                        <h2 class="glass-title">
                            {{ hero.head }} <em>{{ hero.last }}</em>
                        </h2>

                        <p v-if="supportText" class="glass-sub">{{ supportText }}</p>

                        <slot name="glass-extra" />
                    </div>
                </div>
            </section>
        </main>

        <!-- ===== RODAPÉ ===== -->
        <footer class="footer">
            <nav>
                <a href="/termos-de-uso" target="_blank" rel="noopener">Termos de Uso</a>
                <span aria-hidden="true">·</span>
                <a href="/politica-privacidade" target="_blank" rel="noopener">Política de Privacidade</a>
            </nav>
            <p>© {{ year }} {{ appName }}</p>
        </footer>

        <CookieConsentBanner />
    </div>
</template>

<style>
/* =========================================================
   Plataforma — telas de conta
   CSS do desenho original de login-nova. As mudanças em relação
   ao protótipo: tudo debaixo de `.brand-auth` (era :root/body),
   o fundo aponta para o JPEG otimizado no lugar do PNG de 1,7 MB
   e há a variante `--wide` para o cadastro.
   ========================================================= */

/* O app pinta o body por baixo; sem isto o overscroll mostra faixa clara. */
body.brand-auth-body { background: #05070f; }

/* ---------- Tokens ---------- */
.brand-auth {
    /* Marca */
    --brand: #2451ff;
    --brand-2: #4f7cff;
    --brand-soft: rgba(36, 81, 255, 0.35);
    --accent: #35d6ff;

    /* Superfícies */
    --ink: #05070f;
    --panel: #06090f;
    --stroke: rgba(255, 255, 255, 0.1);
    --stroke-soft: rgba(255, 255, 255, 0.06);

    /* Texto */
    --text: #eef2ff;
    --text-2: #a8b3cf;
    --text-3: #7c88a6;

    /* Feedback */
    --danger: #ff6b6b;

    /* Geometria */
    --radius: 28px;
    --radius-sm: 14px;

    /* Posição do fundo */
    --bg-x: 50%;
    --bg-y: 46%;

    /* Sombras */
    --shadow-card: 0 40px 120px -30px rgba(0, 0, 0, 0.85);
    --shadow-btn: 0 12px 30px -10px var(--brand-soft);
}

/* ---------- Raiz da página (era o <body> do protótipo) ---------- */
.brand-auth {
    position: relative;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    color: var(--text);
    background: var(--ink);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    overflow-x: hidden;
}
.brand-auth *,
.brand-auth *::before,
.brand-auth *::after { box-sizing: border-box; }
.brand-auth img { max-width: 100%; display: block; }
.brand-auth a { color: inherit; text-decoration: none; }
.brand-auth button { font: inherit; }

/* =========================================================
   FUNDO
   ========================================================= */
.brand-auth .bg { position: fixed; inset: 0; z-index: 0; overflow: hidden; background: var(--ink); }

.brand-auth .bg__image {
    position: absolute; inset: 0;
    background-image: url('/images/login-bg.jpg');
    background-size: cover;
    background-position: var(--bg-x) var(--bg-y);
    background-repeat: no-repeat;
    transform: scale(1.04);
    animation: brandBgIn 1.6s cubic-bezier(.2, .7, .2, 1) both;
}
@keyframes brandBgIn {
    from { opacity: 0; transform: scale(1.09); }
    to   { opacity: 1; transform: scale(1.04); }
}

.brand-auth .bg__vignette {
    position: absolute; inset: 0;
    background:
        radial-gradient(120% 90% at 50% 45%, transparent 35%, rgba(2, 4, 10, .55) 78%, rgba(2, 4, 10, .9) 100%),
        linear-gradient(180deg, rgba(2, 4, 10, .72) 0%, transparent 22%, transparent 70%, rgba(2, 4, 10, .8) 100%);
}

/* Granulado sutil — tira o "banding" do céu */
.brand-auth .bg__grain {
    position: absolute; inset: 0; opacity: .055; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* =========================================================
   TOPO / RODAPÉ
   ========================================================= */
.brand-auth .topbar {
    position: relative; z-index: 2;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: clamp(16px, 2.2vh, 26px) clamp(20px, 4vw, 48px);
    animation: brandFadeDown .8s .1s cubic-bezier(.2, .7, .2, 1) both;
}
.brand-auth .brand { display: inline-block; }
.brand-auth .brand img { height: clamp(20px, 2.4vh, 28px); width: auto; filter: drop-shadow(0 4px 18px rgba(36, 81, 255, .45)); }

.brand-auth .footer {
    position: relative; z-index: 2;
    padding: clamp(12px, 1.8vh, 22px) 20px clamp(16px, 2.4vh, 28px);
    text-align: center; font-size: 12.5px; color: var(--text-3);
    animation: brandFadeUp .9s .35s cubic-bezier(.2, .7, .2, 1) both;
}
.brand-auth .footer nav { display: flex; gap: 10px; justify-content: center; align-items: center; }
.brand-auth .footer a { transition: color .2s ease; }
.brand-auth .footer a:hover { color: var(--text); }
.brand-auth .footer p { margin: 6px 0 0; }

/* =========================================================
   PALCO + CARD
   Proporção próxima do quadrado (≈ 1,17 : 1 — 820 × 700)
   ========================================================= */
.brand-auth .stage {
    position: relative; z-index: 2;
    flex: 1;
    display: grid; place-items: center;
    padding: clamp(8px, 2vh, 22px) clamp(16px, 4vw, 56px);
}

.brand-auth .card {
    position: relative;
    width: min(820px, 100%);
    height: clamp(560px, 84vh, 700px);
    display: grid;
    grid-template-columns: minmax(320px, 48%) 1fr;
    border-radius: var(--radius);
    border: 1px solid rgba(255, 255, 255, .11);
    box-shadow: var(--shadow-card);
    isolation: isolate;
    overflow: hidden;
    animation: brandCardIn 1s .15s cubic-bezier(.2, .7, .2, 1) both;
}

/* Cadastro: mais campos por passo pedem coluna e altura maiores */
.brand-auth .card--wide {
    width: min(980px, 100%);
    height: clamp(560px, 88vh, 760px);
    grid-template-columns: minmax(380px, 55%) 1fr;
}
.brand-auth .card--wide .form-inner { max-width: 440px; }

/* ---------- Superfície do card: UMA camada só ----------
   Um único elemento carrega o desfoque do cenário E o degradê escuro.
   Como não há dois backdrop-filter empilhados, não existe emenda,
   linha ou sombra entre o formulário e a área de boas-vindas.        */
.brand-auth .card__veil {
    position: absolute; inset: 0; z-index: 0;
    pointer-events: none;
    background:
        /* brilho azul no topo do lado do formulário */
        linear-gradient(160deg, rgba(36, 81, 255, .14) 0%, transparent 38%),
        /* transição contínua: sólido → vidro */
        linear-gradient(90deg,
            rgba(6, 9, 15, .96)  0%,
            rgba(6, 9, 15, .95) 38%,
            rgba(6, 9, 15, .86) 50%,
            rgba(6, 9, 15, .62) 60%,
            rgba(6, 9, 15, .34) 70%,
            rgba(6, 9, 15, .14) 80%,
            rgba(6, 9, 15, .04) 90%,
            rgba(6, 9, 15, 0)  100%),
        /* leve escurecida no pé, para o texto branco respirar */
        linear-gradient(180deg, rgba(255, 255, 255, .045) 0%, transparent 40%, rgba(3, 6, 14, .35) 100%);
    backdrop-filter: blur(3px) saturate(118%) brightness(1.04);
    -webkit-backdrop-filter: blur(3px) saturate(118%) brightness(1.04);
}

/* ---------- Painel do formulário ---------- */
.brand-auth .card__form {
    position: relative;
    z-index: 1;
    padding: clamp(26px, 4vh, 44px) clamp(24px, 3vw, 40px);
    display: flex; align-items: center;
    /* passo alto do cadastro, Turnstile ou modo demonstração passam da
       altura do cartão: rola por dentro em vez de cortar */
    overflow-y: auto;
    overscroll-behavior: contain;
}
.brand-auth .form-inner { position: relative; width: 100%; max-width: 360px; margin: 0 auto; }

/* ---------- Painel de boas-vindas ---------- */
.brand-auth .card__glass {
    position: relative;
    z-index: 1;
    container-type: inline-size;
    min-width: 0;
    padding: clamp(28px, 4.4vh, 46px) clamp(26px, 3vw, 44px);
    display: flex; align-items: flex-end;
}

.brand-auth .glass-content {
    position: relative; z-index: 1;
    width: 100%;
    text-shadow: 0 2px 28px rgba(0, 0, 0, .7);
}

/* Badge estilo "pill" com ponto luminoso */
.brand-auth .badge {
    display: inline-flex; align-items: center; gap: 9px;
    margin-bottom: clamp(14px, 2.4vh, 22px);
    padding: 7px 14px 7px 11px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, .16);
    background: rgba(255, 255, 255, .07);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    font-size: 12.5px; font-weight: 500; letter-spacing: .01em; color: #dbe4ff;
}
.brand-auth .badge__dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 0 rgba(53, 214, 255, .55);
    animation: brandPulse 2.4s ease-out infinite;
}

.brand-auth .glass-title {
    margin: 0 0 14px;
    /* limitado pela LARGURA DO PAINEL, não pela da tela — por isso o cqw */
    font-size: clamp(22px, 9cqw, 32px);
    line-height: 1.12;
    font-weight: 700;
    letter-spacing: -.03em;
    text-wrap: balance;
    overflow-wrap: break-word;
    hyphens: none;
}
.brand-auth .glass-title em {
    font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
    font-style: italic;
    font-weight: 400;
    letter-spacing: -.01em;
    padding-right: .06em;
}
.brand-auth .glass-sub {
    margin: 0;
    max-width: 34ch;
    color: #c3cfe9;
    font-size: 14.5px;
    line-height: 1.6;
}

/* Roteiro dos passos na faixa (cadastro) */
.brand-auth .glass-steps {
    list-style: none;
    margin: clamp(16px, 2.6vh, 24px) 0 0;
    padding: 0;
    display: grid;
    gap: 8px;
}
.brand-auth .glass-steps li {
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; color: rgba(195, 207, 233, .62);
    transition: color .25s ease;
}
.brand-auth .glass-steps li i {
    width: 20px; height: 20px; flex: none;
    display: grid; place-items: center;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, .18);
    font-style: normal; font-size: 11px; font-weight: 600;
    transition: background .25s ease, border-color .25s ease, color .25s ease;
}
.brand-auth .glass-steps li.is-done { color: rgba(195, 207, 233, .85); }
.brand-auth .glass-steps li.is-done i { background: rgba(255, 255, 255, .12); border-color: rgba(255, 255, 255, .24); }
.brand-auth .glass-steps li.is-current { color: var(--text); font-weight: 600; }
.brand-auth .glass-steps li.is-current i { background: var(--brand); border-color: var(--brand); color: #fff; }

/* =========================================================
   FORMULÁRIO
   ========================================================= */
.brand-auth .title { margin: 0 0 6px; font-size: clamp(25px, 2.8vw, 30px); font-weight: 700; letter-spacing: -.03em; }
.brand-auth .subtitle { margin: 0 0 clamp(16px, 2.8vh, 26px); color: var(--text-2); font-size: 14px; line-height: 1.55; }

.brand-auth .field { margin-bottom: clamp(10px, 1.8vh, 16px); }
.brand-auth .field label {
    display: block; margin-bottom: 8px;
    font-size: 12.5px; font-weight: 600; letter-spacing: .01em; color: var(--text-2);
}

.brand-auth .input-wrap { position: relative; display: flex; align-items: center; }
.brand-auth .input-icon {
    position: absolute; left: 14px; width: 18px; height: 18px;
    fill: none; stroke: var(--text-3); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round;
    pointer-events: none; transition: stroke .2s ease;
}
.brand-auth .input-wrap input,
.brand-auth .input-wrap select {
    width: 100%;
    height: 50px;
    padding: 0 46px 0 44px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, .045);
    color: var(--text);
    font-family: inherit;
    font-size: 14.5px;
    outline: none;
    transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
}
/* Campo sem ícone à esquerda (cadastro) fecha o recuo */
.brand-auth .input-wrap--plain input { padding-left: 16px; padding-right: 16px; }
.brand-auth .input-wrap input::placeholder { color: var(--text-3); }
.brand-auth .input-wrap input:hover { border-color: rgba(255, 255, 255, .18); }
.brand-auth .input-wrap input:focus {
    border-color: var(--brand-2);
    background: rgba(255, 255, 255, .07);
    box-shadow: 0 0 0 4px rgba(36, 81, 255, .18);
}
.brand-auth .input-wrap:focus-within .input-icon { stroke: var(--brand-2); }
/* o seletor de data do Chrome vem preto sobre preto */
.brand-auth .input-wrap input[type='date']::-webkit-calendar-picker-indicator {
    filter: invert(1); opacity: .5; cursor: pointer;
}

/* Autofill do Chrome não pode ficar branco */
.brand-auth .input-wrap input:-webkit-autofill,
.brand-auth .input-wrap input:-webkit-autofill:focus {
    -webkit-text-fill-color: var(--text);
    -webkit-box-shadow: 0 0 0 1000px #0d1220 inset;
    caret-color: var(--text);
}

.brand-auth .toggle-pass {
    position: absolute; right: 8px;
    width: 34px; height: 34px;
    display: grid; place-items: center;
    border: 0; border-radius: 10px; cursor: pointer;
    background: transparent; color: var(--text-3);
    transition: color .2s ease, background .2s ease;
}
.brand-auth .toggle-pass:hover { color: var(--text); background: rgba(255, 255, 255, .07); }
.brand-auth .toggle-pass svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.brand-auth .toggle-pass .eye-off { display: none; }
.brand-auth .toggle-pass[aria-pressed='true'] .eye { display: none; }
.brand-auth .toggle-pass[aria-pressed='true'] .eye-off { display: block; }

/* Erro */
.brand-auth .error {
    display: block; min-height: 15px; margin-top: 5px;
    font-size: 12px; color: var(--danger);
    opacity: 0; transform: translateY(-3px);
    transition: opacity .2s ease, transform .2s ease;
}
.brand-auth .error.is-visible { opacity: 1; transform: none; }
.brand-auth .field.has-error .input-wrap input { border-color: rgba(255, 107, 107, .6); box-shadow: 0 0 0 4px rgba(255, 107, 107, .12); }
.brand-auth .field.has-error .input-wrap { animation: brandShake .35s ease; }

/* Dica abaixo do campo */
.brand-auth .hint { margin: 5px 0 0; font-size: 12px; line-height: 1.45; color: var(--text-3); }
.brand-auth .hint.is-warn { color: #f0c674; }

/* Linha: lembrar / esqueci */
.brand-auth .row {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    margin: 4px 0 clamp(14px, 2.4vh, 22px);
}
.brand-auth .check { display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; }
.brand-auth .check input { position: absolute; opacity: 0; width: 0; height: 0; }
.brand-auth .check .box {
    width: 18px; height: 18px; flex: none;
    border-radius: 6px; border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, .05);
    display: grid; place-items: center;
    transition: background .2s ease, border-color .2s ease;
}
.brand-auth .check .box svg {
    width: 12px; height: 12px; fill: none; stroke: #fff; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round;
    opacity: 0; transform: scale(.6); transition: opacity .18s ease, transform .18s ease;
}
.brand-auth .check input:checked + .box { background: var(--brand); border-color: var(--brand); }
.brand-auth .check input:checked + .box svg { opacity: 1; transform: scale(1); }
.brand-auth .check input:focus-visible + .box { box-shadow: 0 0 0 4px rgba(36, 81, 255, .25); }
.brand-auth .check-label { font-size: 13.5px; color: var(--text-2); }
/* Aceite dos termos: caixa alinhada no topo de um texto de duas linhas */
.brand-auth .check--block { align-items: flex-start; gap: 11px; line-height: 1.5; }
.brand-auth .check--block .box { margin-top: 2px; }
.brand-auth .check--block .check-label { font-size: 13px; }

.brand-auth .link { font-size: 13.5px; font-weight: 600; color: var(--brand-2); transition: color .2s ease; }
.brand-auth .link:hover { color: #87a5ff; }
.brand-auth .check-label .link { font-size: inherit; }

/* Desafio de segurança (Turnstile) — respira como um campo */
.brand-auth .turnstile { margin: 0 0 clamp(12px, 2vh, 18px); }

/* Botão */
.brand-auth .btn {
    position: relative; overflow: hidden;
    width: 100%; height: 52px;
    border: 0; border-radius: var(--radius-sm);
    background: linear-gradient(180deg, var(--brand-2), var(--brand));
    color: #fff; font-family: inherit; font-size: 15px; font-weight: 600; letter-spacing: .01em;
    cursor: pointer;
    box-shadow: var(--shadow-btn);
    transition: transform .18s ease, box-shadow .25s ease, filter .2s ease;
}
.brand-auth .btn:hover { transform: translateY(-1px); box-shadow: 0 18px 40px -12px var(--brand-soft); filter: brightness(1.06); }
.brand-auth .btn:active { transform: translateY(0) scale(.99); }
.brand-auth .btn:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
.brand-auth .btn:disabled { cursor: default; filter: saturate(.6) brightness(.85); box-shadow: none; transform: none; }

.brand-auth .btn__spinner {
    position: absolute; inset: 0; margin: auto;
    width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, .35); border-top-color: #fff;
    opacity: 0;
}
.brand-auth .btn.is-loading { pointer-events: none; }
.brand-auth .btn.is-loading .btn__label { opacity: 0; }
.brand-auth .btn.is-loading .btn__spinner { opacity: 1; animation: brandSpin .7s linear infinite; }

/* Ripple do clique */
.brand-auth .ripple {
    position: absolute; border-radius: 50%; transform: translate(-50%, -50%) scale(0);
    background: rgba(255, 255, 255, .35); pointer-events: none;
    animation: brandRipple .55s ease-out forwards;
}

/* Variante discreta: voltar, modo demonstração, ações secundárias */
.brand-auth .btn--ghost {
    height: 44px; font-size: 14px;
    background: rgba(255, 255, 255, .05);
    border: 1px solid var(--stroke);
    color: var(--text-2);
    box-shadow: none;
}
.brand-auth .btn--ghost:hover { background: rgba(255, 255, 255, .09); color: var(--text); filter: none; box-shadow: none; }
.brand-auth .btn--auto { width: auto; padding: 0 18px; }

.brand-auth .form-note { min-height: 18px; margin: 12px 0 0; font-size: 13px; color: var(--text-2); text-align: center; }
.brand-auth .form-note.is-error { color: var(--danger); }
.brand-auth .form-note.is-ok { color: #5fe3a1; }

.brand-auth .signup { margin: clamp(14px, 2.2vh, 22px) 0 0; font-size: 13.5px; color: var(--text-2); }

/* Modo demonstração — a mesma linguagem, em variante discreta */
.brand-auth .demo { margin-top: clamp(14px, 2.2vh, 20px); padding-top: clamp(14px, 2.2vh, 20px); border-top: 1px solid var(--stroke-soft); }
.brand-auth .demo__note { margin: 0 0 10px; font-size: 12.5px; line-height: 1.5; color: var(--text-3); }
.brand-auth .demo__actions { display: grid; gap: 8px; }

/* =========================================================
   CADASTRO — passo a passo
   ========================================================= */
.brand-auth .steps-head {
    display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
    margin-bottom: 10px;
    font-size: 12px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase;
    color: var(--text-3);
}
.brand-auth .steps-head b { color: var(--brand-2); font-weight: 600; }
.brand-auth .steps-bar { height: 4px; border-radius: 999px; background: rgba(255, 255, 255, .09); overflow: hidden; margin-bottom: clamp(16px, 2.6vh, 24px); }
.brand-auth .steps-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--brand-2), var(--brand)); transition: width .35s cubic-bezier(.2, .7, .2, 1); }

/* Escolha em cartões (pessoa física / jurídica) */
.brand-auth .picker { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: clamp(12px, 2vh, 18px); }
.brand-auth .picker button {
    text-align: left; cursor: pointer;
    padding: 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, .045);
    color: var(--text-2);
    transition: border-color .2s ease, background .2s ease, color .2s ease;
}
.brand-auth .picker button:hover { border-color: rgba(255, 255, 255, .2); }
.brand-auth .picker button svg { width: 20px; height: 20px; margin-bottom: 8px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.brand-auth .picker button b { display: block; font-size: 13.5px; font-weight: 600; color: var(--text); }
.brand-auth .picker button span { display: block; margin-top: 2px; font-size: 12px; color: var(--text-3); }
.brand-auth .picker button.is-on {
    border-color: var(--brand-2);
    background: rgba(36, 81, 255, .14);
    color: var(--text);
    box-shadow: 0 0 0 3px rgba(36, 81, 255, .14);
}

/* Escolha em lista (faixa de faturamento) */
.brand-auth .options { display: grid; gap: 8px; margin-bottom: clamp(12px, 2vh, 18px); }
.brand-auth .options label {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 13px 16px; cursor: pointer;
    border-radius: var(--radius-sm);
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, .045);
    font-size: 13.5px; color: var(--text-2);
    transition: border-color .2s ease, background .2s ease, color .2s ease;
}
.brand-auth .options label:hover { border-color: rgba(255, 255, 255, .2); }
.brand-auth .options input { position: absolute; opacity: 0; width: 0; height: 0; }
.brand-auth .options label i {
    width: 18px; height: 18px; flex: none; border-radius: 50%;
    border: 1px solid var(--stroke); display: grid; place-items: center;
    transition: border-color .2s ease, background .2s ease;
}
.brand-auth .options label i::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #fff; opacity: 0; transform: scale(.5); transition: opacity .18s ease, transform .18s ease; }
.brand-auth .options label.is-on { border-color: var(--brand-2); background: rgba(36, 81, 255, .14); color: var(--text); }
.brand-auth .options label.is-on i { border-color: var(--brand); background: var(--brand); }
.brand-auth .options label.is-on i::after { opacity: 1; transform: scale(1); }

/* Duas colunas dentro de um passo (número/complemento, cidade/UF) */
.brand-auth .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.brand-auth .pair--tight { grid-template-columns: 1fr 88px; }

/* Aviso do passo (validação antes de avançar) */
.brand-auth .alert {
    margin: 0 0 clamp(12px, 2vh, 16px);
    padding: 11px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 107, 107, .35);
    background: rgba(255, 107, 107, .1);
    font-size: 13px; line-height: 1.45; color: #ffb4b4;
}

/* Rodapé do passo: voltar à esquerda, avançar à direita */
.brand-auth .wizard-actions { display: flex; align-items: center; gap: 10px; margin-top: clamp(14px, 2.2vh, 20px); }
.brand-auth .wizard-actions .btn { flex: 1; }
.brand-auth .wizard-actions .btn--ghost { flex: none; height: 52px; width: auto; padding: 0 18px; }

/* Campo-armadilha do formulário (honeypot) */
.brand-auth .trap { position: absolute; left: -9999px; width: 0; height: 0; overflow: hidden; opacity: 0; }

/* =========================================================
   ANIMAÇÕES
   ========================================================= */
@keyframes brandCardIn { from { opacity: 0; transform: translateY(26px) scale(.985); } to { opacity: 1; transform: none; } }
@keyframes brandFadeDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
@keyframes brandFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes brandSpin { to { transform: rotate(360deg); } }
@keyframes brandRipple { to { transform: translate(-50%, -50%) scale(1); opacity: 0; } }
@keyframes brandShake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-5px) } 75% { transform: translateX(5px) } }
@keyframes brandPulse {
    0%   { box-shadow: 0 0 0 0 rgba(53, 214, 255, .55); }
    70%  { box-shadow: 0 0 0 9px rgba(53, 214, 255, 0); }
    100% { box-shadow: 0 0 0 0 rgba(53, 214, 255, 0); }
}

/* Entrada escalonada */
.brand-auth .form-inner > *,
.brand-auth .form-inner form > * { animation: brandFadeUp .7s cubic-bezier(.2, .7, .2, 1) both; }
.brand-auth .title { animation-delay: .35s; }
.brand-auth .subtitle { animation-delay: .42s; }
.brand-auth .form-inner form .field:nth-of-type(1) { animation-delay: .50s; }
.brand-auth .form-inner form .field:nth-of-type(2) { animation-delay: .57s; }
.brand-auth .form-inner form .row { animation-delay: .64s; }
.brand-auth .form-inner form .btn { animation-delay: .70s; }
.brand-auth .signup { animation-delay: .78s; }
.brand-auth .badge { animation: brandFadeUp .8s .48s cubic-bezier(.2, .7, .2, 1) both; }
.brand-auth .glass-title { animation: brandFadeUp .8s .56s cubic-bezier(.2, .7, .2, 1) both; }
.brand-auth .glass-sub { animation: brandFadeUp .8s .64s cubic-bezier(.2, .7, .2, 1) both; }
.brand-auth .glass-steps { animation: brandFadeUp .8s .72s cubic-bezier(.2, .7, .2, 1) both; }
/* O passo a passo troca de conteúdo o tempo todo: sem delay, senão a
   cada avanço a coluna pisca em branco. */
.brand-auth .form-inner form .wizard-step > * { animation: none; }

/* =========================================================
   RESPONSIVO
   Alvo: 1366×768, 1440×900, 1600×900, 1920×1080
   ========================================================= */

/* Notebooks baixos (768px de altura):
   a largura encolhe junto com a altura para o card não "deitar". */
@media (max-height: 800px) {
    .brand-auth { --radius: 24px; }
    .brand-auth .card { width: min(700px, 100%); height: clamp(470px, 82vh, 580px); }
    .brand-auth .card--wide { width: min(880px, 100%); height: clamp(470px, 86vh, 660px); }
    .brand-auth .input-wrap input { height: 46px; }
    .brand-auth .btn { height: 48px; }
    .brand-auth .wizard-actions .btn--ghost { height: 48px; }
    .brand-auth .glass-title { font-size: clamp(20px, 8.4cqw, 28px); }
}

@media (max-height: 680px) {
    .brand-auth .subtitle { margin-bottom: 12px; }
    .brand-auth .glass-sub { display: none; }
    .brand-auth .card { width: min(640px, 100%); height: auto; min-height: 430px; }
    .brand-auth .card--wide { width: min(860px, 100%); height: auto; min-height: 480px; }
}

/* Telas grandes */
@media (min-width: 1700px) {
    .brand-auth .card { width: min(900px, 100%); height: clamp(600px, 78vh, 780px); }
    .brand-auth .card--wide { width: min(1060px, 100%); height: clamp(640px, 82vh, 840px); }
}

/* Tablets / telas médias — vira coluna única */
@media (max-width: 1024px) {
    .brand-auth .card,
    .brand-auth .card--wide {
        grid-template-columns: 1fr;
        height: auto;
        width: min(480px, 100%);
        max-width: 480px;
    }
    .brand-auth .card__form {
        padding: clamp(28px, 5vw, 42px);
        justify-content: center;
    }
    .brand-auth .card__veil {
        background:
            linear-gradient(160deg, rgba(36, 81, 255, .14) 0%, transparent 40%),
            rgba(6, 9, 15, .95);
    }
    .brand-auth .card__glass { display: none; }
    .brand-auth .form-inner,
    .brand-auth .card--wide .form-inner { max-width: 100%; }
}

/* Telas pequenas puxam o fundo leve — 63 KB no lugar de 171 KB */
@media (max-width: 960px) {
    .brand-auth .bg__image { background-image: url('/images/login-bg-sm.jpg'); }
}

/* Celulares */
@media (max-width: 520px) {
    .brand-auth { --radius: 20px; }
    .brand-auth .stage { padding: 8px 14px; }
    .brand-auth .card { box-shadow: 0 24px 60px -24px rgba(0, 0, 0, .9); }
    .brand-auth .card__form { padding: 26px 20px 30px; }
    .brand-auth .title { font-size: 24px; }
    .brand-auth .row { flex-wrap: wrap; }
    .brand-auth .footer nav { flex-wrap: wrap; }
    .brand-auth .picker { grid-template-columns: 1fr; }
}

/* Acessibilidade — respeita quem desativou animações */
@media (prefers-reduced-motion: reduce) {
    .brand-auth *,
    .brand-auth *::before,
    .brand-auth *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
    }
}

/* Fallback: navegador sem backdrop-filter */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .brand-auth .card__veil { background: linear-gradient(90deg, rgba(6, 9, 15, .97) 0%, rgba(6, 9, 15, .95) 40%, rgba(6, 9, 15, .6) 62%, rgba(6, 9, 15, .25) 80%, rgba(10, 16, 30, .28) 100%); }
}
</style>
