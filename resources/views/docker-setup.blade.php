<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Configuração inicial (Docker)</title>
    <style>
        :root { --bg:#f4f4f5; --card:#fff; --text:#18181b; --muted:#71717a; --border:#e4e4e7; --primary:#fbae0e; --danger-bg:#fff1f2; --danger:#9f1239; --ok-bg:#ecfdf5; --ok:#065f46; }
        * { box-sizing: border-box; }
        body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background:var(--bg); color:var(--text); min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
        .wrap { width:100%; max-width:36rem; }
        .brand { text-align:center; margin-bottom:1.5rem; }
        .brand img { height:56px; width:auto; margin:0 auto 1rem; display:block; }
        h1 { margin:0; font-size:1.5rem; }
        .lead { margin:.35rem 0 0; color:var(--muted); font-size:.9rem; }
        .card { background:var(--card); border:1px solid var(--border); border-radius:1rem; padding:1.5rem; box-shadow:0 1px 2px rgba(0,0,0,.04); }
        label { display:block; font-size:.875rem; font-weight:600; margin-bottom:.4rem; }
        input { width:100%; border:1px solid var(--border); border-radius:.75rem; padding:.85rem 1rem; font:inherit; background:#fff; }
        input:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 3px rgba(251,174,14,.25); }
        .hint { margin:.5rem 0 0; font-size:.75rem; color:var(--muted); }
        .hint code { font-family:ui-monospace, monospace; }
        .field { margin-bottom:1rem; }
        button { width:100%; border:0; border-radius:.75rem; padding:.9rem 1rem; font:inherit; font-weight:700; color:#111; background:var(--primary); cursor:pointer; }
        button:hover { filter:brightness(.97); }
        .foot { margin-top:.85rem; font-size:.75rem; color:var(--muted); }
        .alert { border-radius:.75rem; padding:.85rem 1rem; font-size:.875rem; margin-bottom:1rem; }
        .alert-ok { background:var(--ok-bg); color:var(--ok); border:1px solid #a7f3d0; }
        .alert-err { background:var(--danger-bg); color:var(--danger); border:1px solid #fecdd3; }
        .mono { font-family:ui-monospace, monospace; font-size:.875rem; }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="brand">
            <img src="/images/logo.png" alt="Plataforma" width="160" height="56">
            <h1>Configuração Docker</h1>
            <p class="lead">Informe o domínio público desta instalação</p>
        </div>

        <div class="card">
            @if (session('success'))
                <div class="alert alert-ok">{{ session('success') }}</div>
            @endif

            @if ($errors->any())
                <div class="alert alert-err">
                    @foreach ($errors->all() as $err)
                        <div>{{ $err }}</div>
                    @endforeach
                </div>
            @endif

            <form method="post" action="{{ url('/docker-setup') }}">
                @csrf

                <div class="field">
                    <label for="domain">Domínio</label>
                    <input
                        id="domain"
                        name="domain"
                        type="text"
                        value="{{ old('domain', $host) }}"
                        placeholder="ex: loja.seudominio.com"
                        autocomplete="off"
                        required
                    >
                    <p class="hint">Use o hostname apontado no DNS (não o IP). Ex.: <code>loja.seudominio.com</code> → salva <code>{{ $suggested_url }}</code></p>
                </div>

                <button type="submit">Salvar e continuar</button>
                <p class="foot">Após salvar, você será levado a criar o primeiro admin (se ainda não existir).</p>
            </form>
        </div>
    </div>
</body>
</html>
