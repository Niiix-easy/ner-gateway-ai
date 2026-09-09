<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

/**
 * Origem Docker/Caddy/nginx costuma falar HTTP com o PHP mesmo com site público em HTTPS
 * (Cloudflare Flexible, TLS no proxy, etc.). Sem forceScheme, @vite e url() geram
 * http://… e o CSP da 1.0.4+ bloqueia scripts/imagens → tela branca.
 */
class ForceHttpsWhenForwardedProto
{
    public function handle(Request $request, Closure $next): Response
    {
        $proto = strtolower((string) $request->headers->get('x-forwarded-proto', ''));
        $isHttpsForwarded = str_contains($proto, 'https');
        if (! $isHttpsForwarded) {
            $cfVisitor = strtolower((string) $request->headers->get('cf-visitor', ''));
            $isHttpsForwarded = str_contains($cfVisitor, 'https');
        }

        $appUrlScheme = strtolower((string) parse_url((string) config('app.url', ''), PHP_URL_SCHEME));
        $forceHttps = $isHttpsForwarded || $appUrlScheme === 'https';

        if ($forceHttps) {
            URL::forceScheme('https');
            $request->server->set('HTTPS', 'on');
            $request->server->set('SERVER_PORT', '443');
        }

        return $next($request);
    }
}

