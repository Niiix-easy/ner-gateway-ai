<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware pass-through.
 *
 * Esta build é white label e não possui licenciamento, telemetria ou recursos
 * pagos por plugin: tudo já vem liberado. Os aliases antigos
 * (license.valid, stacker.license, plugin.feature, fleet.unlocked) apontam para
 * cá para que rotas legadas continuem funcionando sem qualquer bloqueio.
 */
class AllowAlways
{
    public function handle(Request $request, Closure $next, ...$args): Response
    {
        return $next($request);
    }
}
