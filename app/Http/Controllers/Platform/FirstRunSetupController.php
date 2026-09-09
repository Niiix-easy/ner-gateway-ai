<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\BrandingSetting;
use App\Models\Setting;
use App\Services\StorageService;
use App\Support\DockerEnvBootstrap;
use App\Support\HtmlSanitizer;
use App\Support\PlatformSetupState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Primeira configuração da plataforma (build white label).
 *
 * É a primeira tela que o operador vê depois de criar o administrador: dá nome,
 * cor, logotipo e contato à plataforma antes de qualquer outra coisa. Grava na
 * camada global de branding (tenant_id = null), a mesma usada depois em
 * Plataforma → Configurações → Personalização.
 */
class FirstRunSetupController extends Controller
{
    /** Campos de imagem aceitos no wizard. */
    private const UPLOAD_FIELDS = [
        'app_logo',
        'app_logo_dark',
        'app_logo_icon',
        'favicon_url',
    ];

    public function show(Request $request): Response|RedirectResponse
    {
        if (PlatformSetupState::isCompleted()) {
            return redirect()->route('plataforma.dashboard');
        }

        $global = BrandingSetting::query()->whereNull('tenant_id')->first();
        $data = is_array($global?->data) ? $global->data : [];

        return Inertia::render('Platform/FirstRunSetup/Index', [
            'initial' => [
                'app_name' => (string) ($data['app_name'] ?? config('app.name', '')),
                'theme_primary' => (string) ($data['theme_primary'] ?? config('platform.theme_primary', '#2135FA')),
                'login_hero_tagline' => (string) ($data['login_hero_tagline'] ?? ''),
                'login_hero_subtagline' => (string) ($data['login_hero_subtagline'] ?? ''),
                'support_whatsapp' => (string) (Setting::get('seller_panel_support_whatsapp', '', null) ?? ''),
                'mail_from_address' => (string) (Setting::get('mail_from_address', config('mail.from.address'), null) ?? ''),
                'mail_from_name' => (string) (Setting::get('mail_from_name', config('mail.from.name'), null) ?? ''),
                'app_url' => rtrim((string) config('app.url'), '/'),
            ],
            'logos' => [
                'app_logo' => $data['app_logo'] ?? null,
                'app_logo_dark' => $data['app_logo_dark'] ?? null,
                'app_logo_icon' => $data['app_logo_icon'] ?? null,
                'favicon_url' => $data['favicon_url'] ?? null,
            ],
        ]);
    }

    /**
     * Upload de um logotipo/favicon durante o wizard (um campo por vez).
     */
    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'field' => ['required', 'string', Rule::in(self::UPLOAD_FIELDS)],
            'file' => ['required', 'file', 'max:4096', 'mimes:jpg,jpeg,png,webp,gif,ico,svg'],
        ]);

        $uploaded = app(StorageService::class)->storeUploadedPublicFile(
            $request->file('file'),
            'branding/global',
        );

        $row = BrandingSetting::query()->firstOrCreate(['tenant_id' => null], ['data' => []]);
        $data = is_array($row->data) ? $row->data : [];
        $data[$validated['field']] = $uploaded['path'];
        $row->update(['data' => $data]);

        return response()->json(['ok' => true, 'url' => $uploaded['url'], 'field' => $validated['field']]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'app_name' => ['required', 'string', 'max:120'],
            'theme_primary' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'login_hero_tagline' => ['nullable', 'string', 'max:180'],
            'login_hero_subtagline' => ['nullable', 'string', 'max:280'],
            'support_whatsapp' => ['nullable', 'string', 'max:40'],
            'mail_from_address' => ['nullable', 'email', 'max:255'],
            'mail_from_name' => ['nullable', 'string', 'max:120'],
            'app_url' => ['nullable', 'url', 'max:255'],
            'accept_responsibility' => ['accepted'],
        ], [
            'accept_responsibility.accepted' => 'É preciso aceitar o termo de responsabilidade para concluir.',
            'theme_primary.regex' => 'Informe a cor no formato hexadecimal, ex.: #2135FA.',
        ]);

        $appName = HtmlSanitizer::plainText($validated['app_name'], 120);

        $row = BrandingSetting::query()->firstOrCreate(['tenant_id' => null], ['data' => []]);
        $data = is_array($row->data) ? $row->data : [];
        $data['app_name'] = $appName;
        $data['theme_primary'] = strtoupper($validated['theme_primary']);

        foreach (['login_hero_tagline', 'login_hero_subtagline'] as $key) {
            $value = trim((string) ($validated[$key] ?? ''));
            if ($value === '') {
                unset($data[$key]);
            } else {
                $data[$key] = HtmlSanitizer::plainText($value, 280);
            }
        }

        $row->update(['data' => $data]);

        Setting::set('mail_from_name', $validated['mail_from_name'] ?? $appName, null);
        if (! empty($validated['mail_from_address'])) {
            Setting::set('mail_from_address', $validated['mail_from_address'], null);
        }

        $whatsapp = trim((string) ($validated['support_whatsapp'] ?? ''));
        if ($whatsapp !== '') {
            Setting::set('seller_panel_support_enabled', true, null);
            Setting::set('seller_panel_support_destination', 'whatsapp', null);
            Setting::set('seller_panel_support_whatsapp', preg_replace('/\D+/', '', $whatsapp), null);
        }

        // APP_NAME / APP_URL no .env para que filas, e-mails e CLI vejam o mesmo nome.
        DockerEnvBootstrap::upsertEnvValue('APP_NAME', $appName);
        if (! empty($validated['app_url'])) {
            DockerEnvBootstrap::upsertEnvValue('APP_URL', rtrim((string) $validated['app_url'], '/'));
        }

        PlatformSetupState::markCompleted();

        return redirect()
            ->route('plataforma.dashboard')
            ->with('success', 'Plataforma configurada. Você pode ajustar tudo em Configurações → Personalização.');
    }
}
