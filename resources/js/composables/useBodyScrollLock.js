import { onUnmounted, watch } from 'vue';

/**
 * Trava a rolagem da página enquanto um diálogo ou gaveta está aberto.
 *
 * Conta quantas camadas estão abertas: com dois overlays empilhados (uma gaveta
 * que abre um diálogo, por exemplo), a rolagem só volta quando o último fecha.
 */
let camadasAbertas = 0;

export function useBodyScrollLock(estaAberto) {
    let travadoPorEste = false;

    function travar() {
        if (travadoPorEste || typeof document === 'undefined') return;
        travadoPorEste = true;
        camadasAbertas += 1;
        document.body.classList.add('andes-overlay-open');
    }

    function soltar() {
        if (!travadoPorEste || typeof document === 'undefined') return;
        travadoPorEste = false;
        camadasAbertas = Math.max(0, camadasAbertas - 1);
        if (camadasAbertas === 0) {
            document.body.classList.remove('andes-overlay-open');
        }
    }

    watch(estaAberto, (aberto) => (aberto ? travar() : soltar()), { immediate: true });

    onUnmounted(soltar);
}
