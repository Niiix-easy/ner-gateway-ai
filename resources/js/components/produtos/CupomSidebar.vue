<script setup>
/**
 * Criar/editar cupom — gaveta no design system Andes.
 *
 * A tela foi montada em torno de uma pergunta: "o que o comprador vai ver?".
 * Por isso o cartão de prévia fica no topo, calculando o desconto sobre um
 * produto real, e cada regra tem atalhos para os valores que se usa de fato,
 * em vez de campos crus para preencher na mão.
 */
import { ref, watch, computed } from 'vue';
import { useForm } from '@inertiajs/vue3';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import AndesMoney from '@/components/dashboard/AndesMoney.vue';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

const props = defineProps({
    open: { type: Boolean, default: false },
    produtos: { type: Array, default: () => [] },
    coupon: { type: Object, default: null },
    /** Códigos já usados, para avisar antes de o servidor recusar. */
    existingCodes: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'success']);

useBodyScrollLock(() => props.open);

const isEdit = computed(() => !!props.coupon);

const form = useForm({
    code: '',
    type: 'percent',
    value: '',
    product_ids: [],
    min_amount: '',
    max_uses: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
});

/* ---------- escopo: todos os produtos ou alguns ---------- */

const escopo = ref('all');
const produtoBusca = ref('');

const produtosFiltrados = computed(() => {
    const termo = produtoBusca.value.trim().toLowerCase();
    if (!termo) return props.produtos;
    return props.produtos.filter((p) => String(p.name ?? '').toLowerCase().includes(termo));
});

function toggleProduct(id) {
    const idx = form.product_ids.indexOf(id);
    if (idx === -1) {
        form.product_ids = [...form.product_ids, id];
    } else {
        form.product_ids = form.product_ids.filter((pid) => pid !== id);
    }
}

function isProductSelected(id) {
    return form.product_ids.includes(id);
}

function setEscopo(valor) {
    escopo.value = valor;
    if (valor === 'all') {
        form.product_ids = [];
    }
}

const productsLabel = computed(() => {
    if (!form.product_ids.length) return 'todos os produtos';
    if (form.product_ids.length === 1) {
        const p = props.produtos.find((x) => x.id === form.product_ids[0]);
        return p ? p.name : '1 produto';
    }
    return `${form.product_ids.length} produtos`;
});

/* ---------- prévia sobre um produto de verdade ---------- */

const valorNumerico = computed(() => parseFloat(String(form.value).replace(',', '.')) || 0);

/* Base do cálculo: o produto selecionado mais caro; sem seleção, o mais caro do catálogo. */
const produtoBase = computed(() => {
    const universo = form.product_ids.length
        ? props.produtos.filter((p) => form.product_ids.includes(p.id))
        : props.produtos;
    if (!universo.length) return null;
    return [...universo].sort((a, b) => (Number(b.price_brl) || 0) - (Number(a.price_brl) || 0))[0];
});

const precoBase = computed(() => Number(produtoBase.value?.price_brl) || 0);

const desconto = computed(() => {
    if (!valorNumerico.value) return 0;
    if (form.type === 'percent') {
        return Math.min((precoBase.value * valorNumerico.value) / 100, precoBase.value);
    }
    return Math.min(valorNumerico.value, precoBase.value);
});

const precoFinal = computed(() => Math.max(precoBase.value - desconto.value, 0));

const descontoLabel = computed(() => {
    if (!valorNumerico.value) return '';
    if (form.type === 'percent') return `${valorNumerico.value}% de desconto`;
    return `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNumerico.value)} de desconto`;
});

/* Aviso quando o desconto zera a venda ou passa do preço. */
const descontoExagerado = computed(() => {
    if (!valorNumerico.value || !precoBase.value) return false;
    if (form.type === 'percent') return valorNumerico.value >= 100;
    return valorNumerico.value >= precoBase.value;
});

/* ---------- código ---------- */

const codigoEmUso = computed(() => {
    const atual = String(form.code ?? '').trim().toLowerCase();
    if (!atual) return false;
    const original = String(props.coupon?.code ?? '').toLowerCase();
    return props.existingCodes.some((c) => String(c).toLowerCase() === atual && atual !== original);
});

/* Gera um código legível: raiz do desconto + 4 caracteres sem ambiguidade. */
function gerarCodigo() {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let sufixo = '';
    for (let i = 0; i < 4; i += 1) {
        sufixo += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
    }
    const raiz = valorNumerico.value
        ? (form.type === 'percent' ? `${Math.round(valorNumerico.value)}OFF` : 'PROMO')
        : 'PROMO';
    form.code = `${raiz}${sufixo}`;
}

/* ---------- atalhos de valor, limite e prazo ---------- */

const atalhosDesconto = computed(() =>
    form.type === 'percent' ? [5, 10, 15, 20, 30, 50] : [10, 20, 50, 100],
);

const limitePreset = ref('none');
const limiteOpcoes = [
    { value: 'none', label: 'Sem limite' },
    { value: '10', label: '10 usos' },
    { value: '50', label: '50 usos' },
    { value: '100', label: '100 usos' },
    { value: 'custom', label: 'Outro' },
];

function setLimite(preset) {
    limitePreset.value = preset;
    if (preset === 'none') form.max_uses = '';
    else if (preset !== 'custom') form.max_uses = preset;
}

const prazoPreset = ref('none');
const prazoOpcoes = [
    { value: 'none', label: 'Sem prazo' },
    { value: '7', label: '7 dias' },
    { value: '30', label: '30 dias' },
    { value: 'custom', label: 'Escolher datas' },
];

function paraInputLocal(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function setPrazo(preset) {
    prazoPreset.value = preset;
    if (preset === 'none') {
        form.valid_from = '';
        form.valid_until = '';
        return;
    }
    if (preset === 'custom') return;

    const agora = new Date();
    const fim = new Date();
    fim.setDate(fim.getDate() + Number(preset));
    form.valid_from = paraInputLocal(agora);
    form.valid_until = paraInputLocal(fim);
}

const prazoLabel = computed(() => {
    if (!form.valid_until) return 'sem prazo';
    const fim = new Date(form.valid_until);
    return `até ${fim.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}`;
});

/* Frase de fechamento, no rodapé: o cupom inteiro em uma linha. */
const resumo = computed(() => {
    if (!valorNumerico.value) return 'Defina o desconto para continuar';
    const partes = [descontoLabel.value, `em ${productsLabel.value}`, prazoLabel.value];
    partes.push(form.max_uses ? `${form.max_uses} usos` : 'usos ilimitados');
    return partes.join(' · ');
});

const podeSalvar = computed(
    () => String(form.code ?? '').trim() !== '' && valorNumerico.value > 0 && !codigoEmUso.value,
);

function close() {
    form.reset();
    escopo.value = 'all';
    produtoBusca.value = '';
    limitePreset.value = 'none';
    prazoPreset.value = 'none';
    emit('close');
}

function submit() {
    if (!podeSalvar.value) return;

    const payload = {
        code: String(form.code).trim().toUpperCase(),
        type: form.type,
        value: valorNumerico.value,
        product_ids: escopo.value === 'all' ? [] : form.product_ids,
        min_amount: form.min_amount ? parseFloat(String(form.min_amount).replace(',', '.')) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses, 10) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
    };

    const onSuccess = () => {
        close();
        emit('success');
    };

    if (isEdit.value) {
        form.transform(() => payload).put(`/produtos/cupons/${props.coupon.id}`, { onSuccess });
    } else {
        form.transform(() => payload).post('/produtos/cupons', { onSuccess });
    }
}

watch(
    () => [props.open, props.coupon],
    () => {
        if (props.open && props.coupon) {
            const c = props.coupon;
            form.code = c.code;
            form.type = c.type;
            form.value = String(c.value ?? '');
            form.product_ids = Array.isArray(c.product_ids) ? [...c.product_ids] : (c.product_id ? [c.product_id] : []);
            form.min_amount = c.min_amount != null ? String(c.min_amount) : '';
            form.max_uses = c.max_uses != null ? String(c.max_uses) : '';
            form.valid_from = c.valid_from ? c.valid_from.slice(0, 16) : '';
            form.valid_until = c.valid_until ? c.valid_until.slice(0, 16) : '';
            form.is_active = !!c.is_active;

            escopo.value = form.product_ids.length ? 'some' : 'all';
            limitePreset.value = c.max_uses ? 'custom' : 'none';
            prazoPreset.value = c.valid_until ? 'custom' : 'none';
        } else if (props.open && !props.coupon) {
            form.reset();
            form.type = 'percent';
            form.is_active = true;
            form.product_ids = [];
            escopo.value = 'all';
            limitePreset.value = 'none';
            prazoPreset.value = 'none';
            produtoBusca.value = '';
        }
    },
    { immediate: true }
);
</script>

<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="andes-dash andes-drawer"
            style="z-index: 100000"
            aria-modal="true"
            role="dialog"
            aria-labelledby="cupom-drawer-title"
        >
            <div class="andes-modal__veil" aria-hidden="true" @click="close" />

            <aside class="andes-ui-card andes-ui-card--padding-none andes-drawer__card andes-drawer__card--wide" @click.stop>
                <header class="andes-drawer__head">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute">
                        <AndesIcon name="clipboard-check" />
                    </span>
                    <span class="andes-dash__list-main">
                        <b id="cupom-drawer-title" class="andes-ui-typography tp-heading-large">
                            {{ isEdit ? 'Editar cupom' : 'Novo cupom' }}
                        </b>
                        <span class="andes-ui-typography tp-body-small c-secondary">
                            O comprador digita o código no checkout e o desconto entra na hora.
                        </span>
                    </span>
                    <button
                        type="button"
                        class="andes-ui-button andes-ui-button--small andes-ui-button--mute andes-ui-icon-button"
                        style="width: 32px; height: 32px; min-height: 32px; margin-left: auto"
                        aria-label="Fechar"
                        @click="close"
                    >
                        <AndesIcon name="close" />
                    </button>
                </header>

                <div class="andes-drawer__body">
                    <!-- Prévia: o cupom valendo sobre um produto real -->
                    <div class="andes-ui-card andes-ui-card--highlight andes-ui-card--padding-large andes-cupom__preview">
                        <div class="andes-ui-typography tp-body-small c-secondary">No checkout do comprador</div>
                        <b class="andes-ui-typography tp-heading-large andes-cup__code andes-cupom__preview-code">
                            {{ form.code ? String(form.code).toUpperCase() : 'SEU-CODIGO' }}
                        </b>

                        <template v-if="produtoBase && valorNumerico">
                            <div class="andes-cupom__prices">
                                <AndesMoney :value="precoBase" size="medium" cents="comma" tone="strikethrough" />
                                <AndesIcon name="chevron-right" />
                                <AndesMoney :value="precoFinal" size="huge" cents="sups" />
                            </div>
                            <span class="andes-ui-typography tp-body-small c-secondary">
                                {{ descontoLabel }} em {{ produtoBase.name }} · o comprador economiza
                                {{ new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(desconto) }}
                            </span>
                        </template>
                        <span v-else class="andes-ui-typography tp-body-small c-secondary">
                            {{ produtoBase ? 'Defina o desconto para ver o preço final.' : 'Cadastre um produto para ver a prévia.' }}
                        </span>
                    </div>

                    <div v-if="descontoExagerado" class="andes-ui-message andes-ui-message--caution andes-block--tight">
                        <span class="andes-ui-message__text">
                            Esse desconto zera o valor da venda em {{ produtoBase?.name }}. Confira antes de publicar.
                        </span>
                    </div>

                    <div v-if="codigoEmUso" class="andes-ui-message andes-ui-message--negative andes-block--tight">
                        <span class="andes-ui-message__text">Já existe um cupom com esse código. Escolha outro ou gere um.</span>
                    </div>

                    <form id="cupom-form" @submit.prevent="submit">
                        <!-- 1. Desconto -->
                        <div class="andes-dash__sectionbar">
                            <b class="andes-ui-typography tp-heading-medium">Desconto</b>
                        </div>

                        <div class="andes-form andes-form--wide andes-block--tight">
                            <div class="andes-segmented">
                                <button
                                    type="button"
                                    class="andes-ui-button andes-ui-button--medium"
                                    :class="form.type === 'percent' ? 'andes-ui-button--quiet' : 'andes-ui-button--mute'"
                                    :aria-pressed="form.type === 'percent' ? 'true' : 'false'"
                                    @click="form.type = 'percent'"
                                >
                                    Percentual
                                </button>
                                <button
                                    type="button"
                                    class="andes-ui-button andes-ui-button--medium"
                                    :class="form.type === 'fixed' ? 'andes-ui-button--quiet' : 'andes-ui-button--mute'"
                                    :aria-pressed="form.type === 'fixed' ? 'true' : 'false'"
                                    @click="form.type = 'fixed'"
                                >
                                    Valor fixo
                                </button>
                            </div>

                            <div class="andes-ui-form-control">
                                <div class="andes-inputgroup">
                                    <span class="andes-inputgroup__prefix">{{ form.type === 'percent' ? '%' : 'R$' }}</span>
                                    <input
                                        id="cupom-valor"
                                        v-model="form.value"
                                        type="number"
                                        step="any"
                                        min="0"
                                        required
                                        class="andes-ui-input"
                                        placeholder="0"
                                    />
                                </div>
                                <div class="andes-chips" style="margin: 8px 0 0">
                                    <button
                                        v-for="atalho in atalhosDesconto"
                                        :key="atalho"
                                        type="button"
                                        class="andes-chip andes-chip--action"
                                        :class="{ 'andes-chip--on': valorNumerico === atalho }"
                                        @click="form.value = String(atalho)"
                                    >
                                        {{ form.type === 'percent' ? `${atalho}%` : `R$ ${atalho}` }}
                                    </button>
                                </div>
                                <p v-if="form.errors.value" class="andes-error">{{ form.errors.value }}</p>
                            </div>
                        </div>

                        <!-- 2. Onde vale -->
                        <div class="andes-dash__sectionbar">
                            <b class="andes-ui-typography tp-heading-medium">Onde vale</b>
                        </div>

                        <div class="andes-form andes-form--wide andes-block--tight">
                            <div class="andes-segmented">
                                <button
                                    type="button"
                                    class="andes-ui-button andes-ui-button--medium"
                                    :class="escopo === 'all' ? 'andes-ui-button--quiet' : 'andes-ui-button--mute'"
                                    :aria-pressed="escopo === 'all' ? 'true' : 'false'"
                                    @click="setEscopo('all')"
                                >
                                    Todos os produtos
                                </button>
                                <button
                                    type="button"
                                    class="andes-ui-button andes-ui-button--medium"
                                    :class="escopo === 'some' ? 'andes-ui-button--quiet' : 'andes-ui-button--mute'"
                                    :aria-pressed="escopo === 'some' ? 'true' : 'false'"
                                    @click="setEscopo('some')"
                                >
                                    Escolher produtos
                                </button>
                            </div>

                            <template v-if="escopo === 'some'">
                                <div class="andes-search">
                                    <span class="andes-search__icon"><AndesIcon name="search" /></span>
                                    <input v-model="produtoBusca" type="text" class="andes-ui-input" placeholder="Buscar produto..." />
                                </div>

                                <ul class="andes-ui-list andes-choicelist andes-cupom__produtos">
                                    <li
                                        v-for="p in produtosFiltrados"
                                        :key="p.id"
                                        class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--selectable"
                                        role="button"
                                        tabindex="0"
                                        @click="toggleProduct(p.id)"
                                        @keydown.enter.prevent="toggleProduct(p.id)"
                                    >
                                        <div class="andes-ui-list__item-content">
                                            <input
                                                type="checkbox"
                                                class="andes-ui-checkbox"
                                                :checked="isProductSelected(p.id)"
                                                tabindex="-1"
                                                @click.stop="toggleProduct(p.id)"
                                            />
                                            <span class="andes-dash__list-main">
                                                <span class="andes-ui-typography tp-body-small w-emphasis">{{ p.name }}</span>
                                                <span v-if="!p.is_active" class="andes-ui-typography tp-body-small c-secondary">Inativo</span>
                                            </span>
                                        </div>
                                        <AndesMoney :value="Number(p.price_brl) || 0" size="xsmall" cents="comma" />
                                    </li>
                                    <li v-if="!produtosFiltrados.length" class="andes-ui-list__item andes-ui-list__item--size-large">
                                        <span class="andes-ui-typography tp-body-small c-secondary">Nenhum produto encontrado.</span>
                                    </li>
                                </ul>
                            </template>
                        </div>

                        <!-- 3. Regras -->
                        <div class="andes-dash__sectionbar">
                            <b class="andes-ui-typography tp-heading-medium">Regras</b>
                        </div>

                        <div class="andes-form andes-form--wide">
                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="cupom-code">Código</label>
                                <div class="andes-cupom__coderow">
                                    <input
                                        id="cupom-code"
                                        v-model="form.code"
                                        type="text"
                                        required
                                        maxlength="50"
                                        class="andes-ui-input andes-cup__code"
                                        :class="{ 'andes-ui-input--error': codigoEmUso }"
                                        placeholder="BLACKFRIDAY"
                                    />
                                    <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--quiet" @click="gerarCodigo">
                                        <AndesIcon name="refresh" />
                                        Gerar
                                    </button>
                                </div>
                                <p v-if="form.errors.code" class="andes-error">{{ form.errors.code }}</p>
                            </div>

                            <div class="andes-ui-form-control">
                                <span class="andes-ui-form-control__label">Limite de usos</span>
                                <div class="andes-chips" style="margin: 0">
                                    <button
                                        v-for="opt in limiteOpcoes"
                                        :key="opt.value"
                                        type="button"
                                        class="andes-chip andes-chip--action"
                                        :class="{ 'andes-chip--on': limitePreset === opt.value }"
                                        @click="setLimite(opt.value)"
                                    >
                                        {{ opt.label }}
                                    </button>
                                </div>
                                <input
                                    v-if="limitePreset === 'custom'"
                                    v-model="form.max_uses"
                                    type="number"
                                    min="1"
                                    class="andes-ui-input"
                                    style="margin-top: 8px"
                                    placeholder="Quantos usos no total?"
                                />
                            </div>

                            <div class="andes-ui-form-control">
                                <span class="andes-ui-form-control__label">Validade</span>
                                <div class="andes-chips" style="margin: 0">
                                    <button
                                        v-for="opt in prazoOpcoes"
                                        :key="opt.value"
                                        type="button"
                                        class="andes-chip andes-chip--action"
                                        :class="{ 'andes-chip--on': prazoPreset === opt.value }"
                                        @click="setPrazo(opt.value)"
                                    >
                                        {{ opt.label }}
                                    </button>
                                </div>
                                <div v-if="prazoPreset === 'custom'" class="andes-filters" style="margin: 8px 0 0">
                                    <div class="andes-ui-form-control">
                                        <label class="andes-ui-form-control__label" for="cupom-de">Começa</label>
                                        <input id="cupom-de" v-model="form.valid_from" type="datetime-local" class="andes-ui-input" />
                                    </div>
                                    <div class="andes-ui-form-control">
                                        <label class="andes-ui-form-control__label" for="cupom-ate">Termina</label>
                                        <input id="cupom-ate" v-model="form.valid_until" type="datetime-local" class="andes-ui-input" />
                                    </div>
                                </div>
                            </div>

                            <div class="andes-ui-form-control">
                                <label class="andes-ui-form-control__label" for="cupom-min">Valor mínimo da compra</label>
                                <div class="andes-inputgroup">
                                    <span class="andes-inputgroup__prefix">R$</span>
                                    <input id="cupom-min" v-model="form.min_amount" type="number" step="any" min="0" class="andes-ui-input" placeholder="Opcional" />
                                </div>
                                <p class="andes-ui-form-control__help">
                                    Abaixo desse valor, o código não é aceito no checkout.
                                </p>
                            </div>

                            <label class="andes-ui-choice">
                                <input v-model="form.is_active" type="checkbox" class="andes-ui-checkbox" />
                                <span class="andes-dash__list-main">
                                    <span class="andes-ui-typography tp-body-medium">Cupom ativo</span>
                                    <span class="andes-ui-typography tp-body-small c-secondary">
                                        Desativado, o código deixa de ser aceito sem perder o histórico de usos.
                                    </span>
                                </span>
                            </label>
                        </div>
                    </form>
                </div>

                <footer class="andes-drawer__foot andes-drawer__foot--summary">
                    <span class="andes-ui-typography tp-body-small c-secondary andes-cupom__resumo">{{ resumo }}</span>
                    <div class="andes-actions">
                        <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" @click="close">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="cupom-form"
                            class="andes-ui-button andes-ui-button--medium andes-ui-button--loud"
                            :disabled="form.processing || !podeSalvar"
                        >
                            {{ form.processing ? 'Salvando...' : (isEdit ? 'Salvar cupom' : 'Criar cupom') }}
                        </button>
                    </div>
                </footer>
            </aside>
        </div>
    </Teleport>
</template>
