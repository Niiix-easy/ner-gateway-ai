(function () {
    const btnTest = document.getElementById('btn-test-db');
    const formDb = document.getElementById('form-database');
    const resultEl = document.getElementById('db-test-result');
    const formApp = document.getElementById('form-app');
    const acceptResponsibility = document.getElementById('accept-responsibility');
    const btnStartInstall = document.getElementById('btn-start-install');

    // Etapa 1: o botão só libera após o aceite do termo de responsabilidade.
    if (acceptResponsibility && btnStartInstall) {
        acceptResponsibility.addEventListener('change', function () {
            btnStartInstall.classList.toggle('pointer-events-none', !acceptResponsibility.checked);
            btnStartInstall.classList.toggle('opacity-40', !acceptResponsibility.checked);
        });
    }

    if (btnTest && formDb && resultEl) {
        btnTest.addEventListener('click', async function () {
            const get = (name) => (formDb.querySelector('[name="' + name + '"]')?.value || '').trim();
            const host = get('db_host') || '127.0.0.1';
            const port = get('db_port') || '3306';
            const database = get('db_database');
            const username = get('db_username');
            const password = get('db_password');
            if (!database || !username) {
                resultEl.className = 'text-sm rounded-lg p-3 bg-red-500/10 text-red-600';
                resultEl.textContent = 'Preencha o nome do banco e usuário.';
                resultEl.classList.remove('hidden');
                return;
            }
            btnTest.disabled = true;
            btnTest.textContent = 'Testando...';
            resultEl.classList.add('hidden');
            try {
                const r = await fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    body: JSON.stringify({
                        action: 'test-db',
                        db_host: host,
                        db_port: port,
                        db_database: database,
                        db_username: username,
                        db_password: password
                    })
                });
                const text = await r.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (_) {
                    throw new Error('Resposta inválida: ' + (text.slice(0, 100) || r.statusText));
                }
                resultEl.classList.remove('hidden');
                if (data.success) {
                    if (data.schema_ok === false) {
                        resultEl.className = 'text-sm rounded-lg p-3 bg-amber-500/10 text-amber-800 dark:text-amber-200';
                        let msg = data.schema_message || 'Conectou, mas o SQL ainda não foi importado.';
                        if (Array.isArray(data.missing_tables) && data.missing_tables.length) {
                            msg += ' Ausentes: ' + data.missing_tables.slice(0, 8).join(', ');
                        }
                        resultEl.textContent = msg;
                    } else {
                        resultEl.className = 'text-sm rounded-lg p-3 bg-green-500/10 text-green-600 dark:text-green-400';
                        resultEl.textContent = data.schema_message || 'Conexão e schema OK!';
                    }
                } else {
                    resultEl.className = 'text-sm rounded-lg p-3 bg-red-500/10 text-red-600 dark:text-red-400';
                    resultEl.textContent = data.message || 'Falha na conexão.';
                }
            } catch (e) {
                resultEl.classList.remove('hidden');
                resultEl.className = 'text-sm rounded-lg p-3 bg-red-500/10 text-red-600 dark:text-red-400';
                resultEl.textContent = 'Erro: ' + (e.message || 'Falha ao conectar.');
            }
            btnTest.disabled = false;
            btnTest.textContent = 'Testar conexão e schema';
        });
    }

    if (formDb) {
        formDb.addEventListener('submit', function (e) {
            if (!formDb.db_database?.value?.trim() || !formDb.db_username?.value?.trim()) {
                e.preventDefault();
                alert('Preencha o nome do banco e usuário.');
            }
        });
    }

    if (formApp) {
        formApp.addEventListener('submit', async function (e) {
            e.preventDefault();
            const formData = new FormData(formApp);
            const baseData = {
                action: 'install-step',
                db_host: formData.get('db_host'),
                db_port: formData.get('db_port'),
                db_database: formData.get('db_database'),
                db_username: formData.get('db_username'),
                db_password: formData.get('db_password'),
                app_name: formData.get('app_name') || 'Plataforma',
                app_url: formData.get('app_url'),
                app_env: formData.get('app_env'),
                session_driver: formData.get('session_driver')
            };
            const statusEl = document.getElementById('install-status');
            const barEl = document.getElementById('install-bar');
            const logEl = document.getElementById('install-log');
            const errEl = document.getElementById('install-error');
            const okEl = document.getElementById('install-success');
            const progressWrap = document.getElementById('install-progress-wrap');
            const progressInner = progressWrap ? progressWrap.querySelector('div:first-child') : null;
            const cronUrlEl = document.getElementById('cron-url');
            formApp.classList.add('hidden');
            if (progressWrap) progressWrap.classList.remove('hidden');

            const labels = [
                'Criando .env e instalando dependências (Composer)...',
                'Gerando chave e validando schema do banco (SQL importado)...',
                'Instalando assets (npm build)...',
                'Finalizando (cache, cron, lock)...'
            ];
            const hints = ['Pode levar 2–5 min na primeira vez. Aguarde.', 'Migrations não rodam aqui — o SQL deve ter sido importado no phpMyAdmin.', 'Opcional se public/build já existir.', ''];

            const callStep = async (step) => {
                const r = await fetch('api.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    body: JSON.stringify({ ...baseData, step })
                });
                const text = await r.text();
                let res;
                try {
                    res = JSON.parse(text);
                } catch (_) {
                    const msg = text.trim()
                        ? text.slice(0, 200)
                        : (r.status === 200
                            ? 'Resposta vazia (possível timeout – tente aumentar max_execution_time no PHP)'
                            : 'Status ' + r.status + ': ' + r.statusText);
                    throw new Error('Resposta inválida: ' + msg);
                }
                return res;
            };

            try {
                let lastRes = null;
                for (let step = 1; step <= 4; step++) {
                    if (statusEl) {
                        statusEl.textContent = labels[step - 1];
                        statusEl.title = hints[step - 1] || '';
                    }
                    if (progressWrap) {
                        const hint = progressWrap.querySelector('.install-step-hint');
                        if (hint) hint.textContent = hints[step - 1] || '';
                    }
                    if (barEl) barEl.style.width = (step - 0.5) * 25 + '%';
                    const res = await callStep(step);
                    lastRes = res;
                    if (!res.success) {
                        if (errEl) {
                            errEl.textContent = res.message || 'Erro na instalação.';
                            errEl.classList.remove('hidden');
                        }
                        if (logEl && res.log) {
                            logEl.textContent = res.log;
                            logEl.classList.remove('hidden');
                        }
                        return;
                    }
                    if (barEl) barEl.style.width = step * 25 + '%';
                }
                if (barEl) barEl.style.width = '100%';
                if (statusEl) statusEl.textContent = 'Concluído!';
                if (progressInner) progressInner.classList.add('hidden');
                if (cronUrlEl && lastRes && lastRes.cron_url) {
                    cronUrlEl.textContent = lastRes.cron_url;
                }
                if (okEl) okEl.classList.remove('hidden');
            } catch (err) {
                if (errEl) {
                    errEl.textContent = 'Erro: ' + (err.message || 'Falha na requisição.');
                    errEl.classList.remove('hidden');
                }
            }
        });
    }
})();
