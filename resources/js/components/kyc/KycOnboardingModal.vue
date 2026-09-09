<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { ShieldCheck } from 'lucide-vue-next';
import KycDocumentsForm from '@/components/kyc/KycDocumentsForm.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    person_type: { type: String, default: 'pf' },
    kyc_status: { type: String, default: 'not_submitted' },
    rejection_reason: { type: String, default: null },
});

const title = computed(() =>
    props.kyc_status === 'rejected'
        ? 'Reenvie seus documentos'
        : 'Complete sua verificação'
);

const subtitle = computed(() =>
    props.kyc_status === 'rejected'
        ? 'A verificação anterior foi rejeitada. Envie os documentos novamente para liberar o painel.'
        : 'Para usar o painel do infoprodutor, envie seus documentos de identidade. Este passo é obrigatório.'
);

function lockBodyScroll(lock) {
    if (typeof document === 'undefined') {
        return;
    }
    document.body.style.overflow = lock ? 'hidden' : '';
}

watch(
    () => props.open,
    (isOpen) => lockBodyScroll(isOpen),
    { immediate: true }
);

onMounted(() => {
    if (props.open) {
        lockBodyScroll(true);
    }
});

onUnmounted(() => {
    lockBodyScroll(false);
});
</script>

<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="fixed inset-0 z-[200000] flex items-end justify-center bg-zinc-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kyc-onboarding-title"
        >
            <div
                class="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:max-h-[90dvh] sm:rounded-2xl"
                @click.stop
            >
                <div class="shrink-0 border-b border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-800/80 sm:px-6">
                    <div class="flex items-start gap-3">
                        <span
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                        >
                            <ShieldCheck class="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div class="min-w-0">
                            <h2
                                id="kyc-onboarding-title"
                                class="text-base font-semibold text-zinc-900 dark:text-white sm:text-lg"
                            >
                                {{ title }}
                            </h2>
                            <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                {{ subtitle }}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                    <KycDocumentsForm
                        embedded
                        :person_type="person_type"
                        :kyc_status="kyc_status"
                        :rejection_reason="rejection_reason"
                    />
                </div>
            </div>
        </div>
    </Teleport>
</template>
