<?php

namespace App\Http\Middleware;

use App\Support\PlatformSetupState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enquanto a primeira configuração não for concluída, o operador da plataforma
 * cai sempre em /plataforma/primeiros-passos.
 */
class EnsurePlatformSetup
{
    public function handle(Request $request, Closure $next): Response
    {
        if (PlatformSetupState::isCompleted()) {
            return $next($request);
        }

        // A própria tela do wizard (e o POST dela) precisam passar.
        if ($request->is(PlatformSetupState::ROUTE_PATH) || $request->is(PlatformSetupState::ROUTE_PATH.'/*')) {
            return $next($request);
        }

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Conclua a primeira configuração da plataforma antes de usar o painel.',
            ], 409);
        }

        return redirect('/'.PlatformSetupState::ROUTE_PATH);
    }
}
