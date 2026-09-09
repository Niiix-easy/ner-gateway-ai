<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Services\PlatformAuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Login da plataforma unificado em /login.
 * Mantém logout + redirects de bookmarks /plataforma/login.
 */
class LoginController extends Controller
{
    public function showLoginForm(): RedirectResponse
    {
        return redirect()->route('login');
    }

    public function login(): RedirectResponse
    {
        return redirect()->route('login');
    }

    public function logout(Request $request): RedirectResponse
    {
        if ($request->user()?->canAccessPlatformPanel()) {
            PlatformAuditService::log('platform.auth.logout', [], $request);
        }
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
