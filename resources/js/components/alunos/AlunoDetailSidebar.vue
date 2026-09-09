<script setup>
import { ref, watch, computed } from 'vue';
import axios from 'axios';
import AndesIcon from '@/components/icons/AndesIcon.vue';
import { useBodyScrollLock } from '@/composables/useBodyScrollLock';

const props = defineProps({
    open: { type: Boolean, default: false },
    aluno: { type: Object, default: null },
    produtos: { type: Array, default: () => [] },
});

const emit = defineEmits(['close', 'updated', 'deleted']);

useBodyScrollLock(() => props.open);

const editing = ref(false);
const saving = ref(false);
const form = ref({
    name: '',
    email: '',
    password: '',
    product_ids: [],
});
const removingProductId = ref(null);
const deleting = ref(false);
const toast = ref({ message: null, type: null });

watch(
    () => props.aluno,
    (a) => {
        if (a) {
            form.value = {
                name: a.name ?? '',
                email: a.email ?? '',
                password: '',
                product_ids: (a.products ?? []).map((p) => p.id),
            };
        }
        editing.value = false;
    },
    { immediate: true }
);

/* Pessoa = círculo. Sem foto, as iniciais fazem o papel da miniatura. */
const initials = computed(() => {
    const nome = String(props.aluno?.name ?? '').trim();
    if (!nome) return '—';
    return nome
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join('');
});

function toggleFormProduct(id) {
    if (form.value.product_ids.includes(id)) {
        form.value.product_ids = form.value.product_ids.filter((x) => x !== id);
    } else {
        form.value.product_ids = [...form.value.product_ids, id];
    }
}

function close() {
    emit('close');
}

function startEdit() {
    editing.value = true;
}

function cancelEdit() {
    editing.value = false;
    if (props.aluno) {
        form.value = {
            name: props.aluno.name ?? '',
            email: props.aluno.email ?? '',
            password: '',
            product_ids: (props.aluno.products ?? []).map((p) => p.id),
        };
    }
}

async function save() {
    if (!props.aluno) return;
    saving.value = true;
    try {
        const { data } = await axios.put(`/produtos/alunos/${props.aluno.id}`, {
            name: form.value.name,
            email: form.value.email,
            password: form.value.password || undefined,
            product_ids: form.value.product_ids,
        });
        showToast(data.message ?? 'Aluno atualizado.', 'success');
        editing.value = false;
        emit('updated', data.aluno);
    } catch (err) {
        showToast(
            err.response?.data?.message ?? 'Erro ao atualizar. Tente novamente.',
            'error'
        );
    } finally {
        saving.value = false;
    }
}

async function removeProduct(produtoId) {
    if (!props.aluno) return;
    removingProductId.value = produtoId;
    try {
        const { data } = await axios.delete(
            `/produtos/alunos/${props.aluno.id}/produtos/${produtoId}`
        );
        showToast(data.message ?? 'Acesso removido.', 'success');
        emit('updated', {
            ...props.aluno,
            products_count: data.products_count ?? 0,
            products: (props.aluno.products ?? []).filter((p) => p.id !== produtoId),
        });
    } catch (err) {
        showToast(
            err.response?.data?.message ?? 'Erro ao remover acesso.',
            'error'
        );
    } finally {
        removingProductId.value = null;
    }
}

async function deleteAluno() {
    if (!props.aluno) return;
    if (!window.confirm('Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.')) {
        return;
    }
    deleting.value = true;
    try {
        await axios.delete(`/produtos/alunos/${props.aluno.id}`);
        showToast('Aluno excluído com sucesso.', 'success');
        close();
        emit('deleted', props.aluno.id);
    } catch (err) {
        showToast(
            err.response?.data?.message ?? 'Erro ao excluir.',
            'error'
        );
    } finally {
        deleting.value = false;
    }
}

function showToast(message, type) {
    toast.value = { message, type };
    setTimeout(() => {
        toast.value = { message: null, type: null };
    }, 4000);
}
</script>


<template>
    <Teleport to="body">
        <div v-show="open" class="andes-dash andes-drawer" style="z-index: 100000" aria-modal="true" role="dialog">
            <div class="andes-modal__veil" aria-hidden="true" @click="close" />

            <aside class="andes-ui-card andes-ui-card--padding-none andes-drawer__card">
                <header class="andes-drawer__head">
                    <span class="andes-ui-thumbnail andes-ui-thumbnail--medium andes-ui-thumbnail--circle andes-ui-thumbnail--mute andes-alu__initials">
                        {{ initials }}
                    </span>
                    <b class="andes-ui-typography tp-heading-large">
                        {{ editing ? 'Editar aluno' : 'Detalhes do aluno' }}
                    </b>
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

                <div v-if="!aluno" class="andes-empty">
                    <span class="andes-ui-typography tp-body-medium c-secondary">Nenhum aluno selecionado.</span>
                </div>

                <template v-else>
                    <!-- Leitura -->
                    <template v-if="!editing">
                        <div class="andes-drawer__summary">
                            <b class="andes-ui-typography tp-heading-large" style="display: block">{{ aluno.name }}</b>
                            <span class="andes-ui-typography tp-body-small c-secondary">{{ aluno.email }}</span>

                            <div class="andes-ui-shortcuts andes-drawer__actions">
                                <button type="button" class="andes-ui-shortcut" @click="startEdit">
                                    <span class="andes-ui-shortcut__icon"><AndesIcon name="pencil" /></span>
                                    <span class="andes-ui-shortcut__label">Editar</span>
                                </button>
                                <button type="button" class="andes-ui-shortcut" :disabled="deleting" @click="deleteAluno">
                                    <span class="andes-ui-shortcut__icon"><AndesIcon name="trash" /></span>
                                    <span class="andes-ui-shortcut__label">{{ deleting ? 'Excluindo' : 'Excluir' }}</span>
                                </button>
                            </div>
                        </div>

                        <div class="andes-drawer__body">
                            <div class="andes-dash__sectionbar">
                                <b class="andes-ui-typography tp-heading-medium">Produtos com acesso</b>
                                <span class="andes-ui-badge andes-ui-badge--medium andes-ui-badge--neutral-quiet">
                                    <span class="andes-ui-badge__content">{{ (aluno.products ?? []).length }}</span>
                                </span>
                            </div>

                            <ul v-if="(aluno.products ?? []).length" class="andes-ui-list">
                                <li
                                    v-for="p in (aluno.products ?? [])"
                                    :key="p.id"
                                    class="andes-ui-list__item andes-ui-list__item--size-small andes-ui-list__item--padding-x-small andes-ui-list__item--divider"
                                >
                                    <div class="andes-ui-list__item-content">
                                        <span class="andes-ui-thumbnail andes-ui-thumbnail--small andes-ui-thumbnail--square andes-ui-thumbnail--mute">
                                            <AndesIcon name="archive" />
                                        </span>
                                        <span class="andes-ui-typography tp-body-small">{{ p.name }}</span>
                                    </div>
                                    <button
                                        type="button"
                                        class="andes-ui-textlink andes-ui-textlink--small"
                                        :disabled="removingProductId === p.id"
                                        @click="removeProduct(p.id)"
                                    >
                                        {{ removingProductId === p.id ? 'Removendo...' : 'Remover' }}
                                    </button>
                                </li>
                            </ul>

                            <p v-else class="andes-ui-typography tp-body-medium c-secondary">
                                Este aluno ainda não tem acesso a nenhum produto.
                            </p>
                        </div>
                    </template>

                    <!-- Edição -->
                    <template v-else>
                        <div class="andes-drawer__body">
                            <form id="aluno-form" class="andes-form andes-form--wide" @submit.prevent="save">
                                <div class="andes-ui-form-control">
                                    <label class="andes-ui-form-control__label" for="aluno-edit-nome">Nome</label>
                                    <input id="aluno-edit-nome" v-model="form.name" type="text" class="andes-ui-input" placeholder="Nome do aluno" />
                                </div>
                                <div class="andes-ui-form-control">
                                    <label class="andes-ui-form-control__label" for="aluno-edit-email">E-mail</label>
                                    <input id="aluno-edit-email" v-model="form.email" type="email" class="andes-ui-input" placeholder="email@exemplo.com" />
                                </div>
                                <div class="andes-ui-form-control">
                                    <label class="andes-ui-form-control__label" for="aluno-edit-senha">Nova senha</label>
                                    <input id="aluno-edit-senha" v-model="form.password" type="password" class="andes-ui-input" placeholder="••••••••" />
                                    <p class="andes-ui-form-control__help">Deixe em branco para manter a senha atual.</p>
                                </div>
                                <div class="andes-ui-form-control">
                                    <span class="andes-ui-form-control__label">Produtos com acesso</span>
                                    <div class="andes-choicelist">
                                        <label v-for="p in produtos" :key="p.id" class="andes-ui-choice">
                                            <input
                                                type="checkbox"
                                                class="andes-ui-checkbox"
                                                :checked="form.product_ids.includes(p.id)"
                                                @change="toggleFormProduct(p.id)"
                                            />
                                            <span class="andes-ui-typography tp-body-small">{{ p.name }}</span>
                                        </label>
                                        <p v-if="!produtos.length" class="andes-menu__label">Nenhum produto disponível</p>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <footer class="andes-drawer__foot">
                            <button type="button" class="andes-ui-button andes-ui-button--medium andes-ui-button--mute" :disabled="saving" @click="cancelEdit">
                                Cancelar
                            </button>
                            <button type="submit" form="aluno-form" class="andes-ui-button andes-ui-button--medium andes-ui-button--loud" :disabled="saving">
                                {{ saving ? 'Salvando...' : 'Salvar' }}
                            </button>
                        </footer>
                    </template>

                    <Transition
                        enter-active-class="transition duration-200 ease-out"
                        enter-from-class="translate-y-2 opacity-0"
                        enter-to-class="translate-y-0 opacity-100"
                        leave-active-class="transition duration-150 ease-in"
                        leave-from-class="translate-y-0 opacity-100"
                        leave-to-class="translate-y-2 opacity-0"
                    >
                        <div v-if="toast.message" class="andes-drawer__toast" role="alert">
                            <div
                                class="andes-ui-message"
                                :class="toast.type === 'error' ? 'andes-ui-message--negative' : 'andes-ui-message--positive'"
                            >
                                <span class="andes-ui-message__text">{{ toast.message }}</span>
                            </div>
                        </div>
                    </Transition>
                </template>
            </aside>
        </div>
    </Teleport>
</template>
