<div class="space-y-6">
    <p class="text-zinc-600 dark:text-zinc-400">
        Bem-vindo ao assistente de instalação. Este processo configura a plataforma em VPS ou hospedagem compartilhada (MySQL).
    </p>
    <ul class="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 list-disc list-inside">
        <li>Importar o SQL do banco no phpMyAdmin (manual)</li>
        <li>Configurar MySQL e validar o schema</li>
        <li>Definir URL, filas (database) e cron HTTP</li>
        <li>Criar o administrador e configurar a plataforma</li>
    </ul>
    <div class="rounded-xl border border-zinc-300 dark:border-zinc-600 p-4 text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
        <p><strong class="text-zinc-800 dark:text-zinc-200">Requisitos</strong></p>
        <p>PHP 8.3+, extensão PDO MySQL, permissão de escrita em <code class="text-xs">storage/</code>, <code class="text-xs">bootstrap/cache/</code> e <code class="text-xs">.env</code>.</p>
        <p>Importe <code class="text-xs">public/install/database.sql</code> em um banco MySQL <strong>vazio</strong> antes da etapa de banco. O wizard <strong>não</strong> roda migrations.</p>
        <p>Node.js é opcional se <code class="text-xs">public/build</code> já vier no pacote.</p>
        <p>Cron a cada minuto apontando para <code class="text-xs">/cron?token=...</code> (gerado na instalação).</p>
    </div>
    <div class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <p class="font-semibold mb-1">Termo de responsabilidade</p>
        <p>
            Este software é entregue <strong>“no estado em que se encontra” (as is)</strong>, sem garantia de
            qualquer natureza. A partir do momento em que você conclui esta instalação, você é
            <strong>o único e exclusivo responsável</strong> pela operação: segurança, proteção de dados,
            conformidade legal e fiscal, disponibilidade, backups, atualizações, integrações de pagamento
            e tudo o que ocorrer na plataforma. Leia <code class="text-xs">docs/RESPONSABILIDADE.md</code>
            antes de continuar.
        </p>
    </div>
    <label class="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
        <input type="checkbox" id="accept-responsibility" class="mt-1 h-4 w-4 rounded border-zinc-400">
        <span>Li e aceito: assumo integralmente a responsabilidade pela instalação e pela operação desta plataforma.</span>
    </label>
    <a href="?step=2" id="btn-start-install"
       class="pointer-events-none opacity-40 inline-flex items-center justify-center w-full rounded-xl bg-[#c8fa64] text-zinc-900 font-semibold py-3 px-4 hover:opacity-90 transition">
        Iniciar instalação
    </a>
</div>
