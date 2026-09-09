<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\SellerDashboardTemplate;
use Tests\TestCase;

class SellerDashboardTemplateTest extends TestCase
{
    public function test_dashboard_template_is_always_aurora(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_PLATFORM_ADMIN,
            'tenant_id' => null,
        ]);

        $this->actingAs($admin)
            ->getJson(route('plataforma.settings.dashboard-template.data'))
            ->assertOk()
            ->assertJsonPath('template', 'aurora');

        $this->actingAs($admin)
            ->putJson(route('plataforma.settings.dashboard-template.update'), [
                'template' => 'kawaii',
            ])
            ->assertOk()
            ->assertJsonPath('template', 'aurora');

        $this->assertSame('aurora', SellerDashboardTemplate::current());
        $this->assertSame('aurora', SellerDashboardTemplate::resolve('default'));
    }

    public function test_seller_dashboard_template_prop_is_aurora(): void
    {
        $this->assertSame('aurora', SellerDashboardTemplate::current());
    }
}
