<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePluginFeature
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $feature = ''): Response
    {
        // Build white label: todos os recursos vêm liberados. Mantido apenas
        // para compatibilidade com rotas que ainda declaram o middleware.
        unset($feature);

        return $next($request);
    }
}
