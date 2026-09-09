<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Support\LoginTemplate;
use Illuminate\Http\JsonResponse;

class LoginTemplateController extends Controller
{
    public function data(): JsonResponse
    {
        return response()->json([
            'template' => LoginTemplate::current(),
        ]);
    }

    public function update(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'template' => LoginTemplate::current(),
            'message' => 'O template de login é fixo (Imersivo).',
        ]);
    }
}
