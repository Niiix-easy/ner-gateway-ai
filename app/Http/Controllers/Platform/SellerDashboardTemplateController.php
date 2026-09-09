<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Support\SellerDashboardTemplate;
use Illuminate\Http\JsonResponse;

class SellerDashboardTemplateController extends Controller
{
    public function data(): JsonResponse
    {
        return response()->json([
            'template' => SellerDashboardTemplate::current(),
        ]);
    }

    public function update(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'template' => SellerDashboardTemplate::current(),
            'message' => 'O template do painel é fixo (Aurora).',
        ]);
    }
}
