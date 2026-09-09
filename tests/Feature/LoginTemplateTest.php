<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\LoginTemplate;
use Tests\TestCase;

class LoginTemplateTest extends TestCase
{
    public function test_login_template_is_always_immersive(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_PLATFORM_ADMIN,
            'tenant_id' => null,
        ]);

        $this->actingAs($admin)
            ->getJson(route('plataforma.settings.login-template.data'))
            ->assertOk()
            ->assertJsonPath('template', 'immersive');

        $this->actingAs($admin)
            ->putJson(route('plataforma.settings.login-template.update'), [
                'template' => 'spotlight',
            ])
            ->assertOk()
            ->assertJsonPath('template', 'immersive');

        $this->assertSame('immersive', LoginTemplate::current());
        $this->assertSame('immersive', LoginTemplate::resolve('default'));
    }

    public function test_login_page_includes_immersive_template_in_public_branding(): void
    {
        User::factory()->create();

        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('public_branding.login_template', 'immersive')
                ->where('public_branding.login_hero_tagline', 'Sua plataforma para vender mais.')
                ->where('public_branding.login_hero_subtagline', 'Feita para quem escala de verdade.')
            );
    }
}
