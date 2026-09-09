<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\DockerEnvBootstrap;
use App\Support\DockerSetupState;
use App\Support\HtmlSanitizer;
use App\Support\PlatformSetupState;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class CreateFirstAdminController extends Controller
{
    /**
     * Show the form to create the first admin user. Only when User::count() === 0.
     */
    public function show(): Response|RedirectResponse|HttpResponse
    {
        if (DockerSetupState::isDocker() && ! DockerSetupState::isSetupDone()) {
            return redirect('/docker-setup');
        }

        $manifest = public_path('build/manifest.json');
        if (! is_file($manifest)) {
            return $this->plainBootError(
                'Arquivo <code>public/build/manifest.json</code> ausente. Envie a pasta <code>public/build</code> do release para o servidor e recarregue.'
            );
        }

        try {
            $manifestData = json_decode((string) file_get_contents($manifest), true);
            if (! is_array($manifestData)
                || ! isset($manifestData['resources/js/app.js'])
                || ! isset($manifestData['resources/css/app.css'])) {
                return $this->plainBootError(
                    'O <code>public/build/manifest.json</code> existe, mas está incompleto (faltam entries do Vite). Reenvie a pasta <code>public/build</code> completa do release.'
                );
            }
        } catch (\Throwable) {
            return $this->plainBootError('Não foi possível ler <code>public/build/manifest.json</code>.');
        }

        try {
            DockerEnvBootstrap::ensureAppKey();
            DockerEnvBootstrap::ensureUsersSchemaReady();

            if (User::count() > 0) {
                return redirect()->route('login');
            }
        } catch (\Throwable $e) {
            report($e);
            $hint = DockerEnvBootstrap::friendlyDatabaseError($e)
                ?? ('Falha ao iniciar a criação do admin. Verifique APP_KEY no .env, MySQL (<code>DB_HOST=localhost</code>, <code>DB_PORT=3306</code>) e se importou o <code>database.sql</code>.<br><br><small>'.e($e->getMessage()).'</small>');

            return $this->plainBootError($hint);
        }

        try {
            return Inertia::render('Auth/CreateFirstAdmin');
        } catch (\Throwable $e) {
            report($e);

            return $this->plainBootError(
                'Falha ao renderizar a página (Inertia/Vite).<br><br><small>'.e($e->getMessage()).'</small>'
            );
        }
    }

    private function plainBootError(string $htmlMessage): HttpResponse
    {
        $body = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            .'<title>Instalação — erro</title>'
            .'<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;color:#18181b}'
            .'.box{border:1px solid #fecaca;background:#fef2f2;color:#991b1b;border-radius:12px;padding:1rem 1.25rem;line-height:1.5}</style>'
            .'</head><body><h1>Não foi possível abrir /criar-admin</h1>'
            .'<div class="box">'.$htmlMessage.'</div>'
            .'<p style="margin-top:1.5rem;color:#71717a;font-size:.9rem">Depois de corrigir, recarregue esta página. Log: <code>storage/logs/laravel.log</code></p>'
            .'</body></html>';

        return response($body, 500)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Create the first admin user. Only when User::count() === 0. Reject with 403 otherwise.
     */
    public function store(Request $request): RedirectResponse
    {
        if (DockerSetupState::isDocker() && ! DockerSetupState::isSetupDone()) {
            return redirect('/docker-setup');
        }

        DockerEnvBootstrap::ensureAppKey();
        DockerEnvBootstrap::ensureUsersSchemaReady();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        try {
            $user = DB::transaction(function () use ($validated) {
                // PostgreSQL não permite SELECT count(*) ... FOR UPDATE.
                if (User::query()->lockForUpdate()->first() !== null) {
                    abort(403, 'O primeiro administrador já foi criado.');
                }

                return User::create([
                    'name' => HtmlSanitizer::plainText($validated['name'], 255),
                    'email' => $validated['email'],
                    'password' => $validated['password'],
                    'role' => User::ROLE_PLATFORM_ADMIN,
                    'tenant_id' => null,
                ]);
            });
        } catch (\Throwable $e) {
            report($e);
            $friendly = DockerEnvBootstrap::friendlyDatabaseError($e);
            throw \Illuminate\Validation\ValidationException::withMessages([
                'email' => $friendly ?? 'Não foi possível criar o administrador. Tente novamente em instantes.',
            ]);
        }

        Auth::login($user);

        // Primeira coisa depois do admin: configurar a identidade da plataforma.
        try {
            PlatformSetupState::reset();
        } catch (\Throwable $e) {
            report($e);
        }

        return redirect()->route('plataforma.first-run.show');
    }
}
