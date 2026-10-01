<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthApiTest extends ApiTestCase
{
    public function test_register_devuelve_token_y_deja_la_cuenta_prearmada(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'María',
            'email' => 'maria@test.com',
            'password' => 'clave-segura-1',
            'password_confirmation' => 'clave-segura-1',
            'device_name' => 'tests',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);

        $user = User::where('email', 'maria@test.com')->firstOrFail();

        // Cuenta pre-armada: categorías (con subcategorías) y productos básicos.
        $this->assertSame(11, Category::where('user_id', $user->id)->count());
        $this->assertSame(3, Category::where('user_id', $user->id)->whereNotNull('parent_id')->count());
        $this->assertSame(36, Product::ownedBy($user)->count());
        $this->assertSame(0, Product::ownedBy($user)->whereNull('category_id')->count());
        $this->assertSame(0, Product::ownedBy($user)->whereNull('canonical_product_id')->count());
    }

    public function test_register_rechaza_email_duplicado(): void
    {
        $this->user(['email' => 'maria@test.com']);

        $this->postJson('/api/register', [
            'name' => 'Otra',
            'email' => 'maria@test.com',
            'password' => 'clave-segura-1',
            'device_name' => 'tests',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_login_con_credenciales_validas(): void
    {
        $user = $this->user(['password' => Hash::make('mi-clave-123')]);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'mi-clave-123',
            'device_name' => 'tests',
        ])->assertOk()->assertJsonStructure(['token', 'user']);
    }

    public function test_login_rechaza_credenciales_invalidas(): void
    {
        $user = $this->user();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'incorrecta',
            'device_name' => 'tests',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_login_avisa_si_la_cuenta_es_de_google(): void
    {
        $user = $this->user(['password' => null, 'google_id' => 'g-123']);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'lo-que-sea',
            'device_name' => 'tests',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.email.0', fn ($m) => str_contains($m, 'Google'));
    }

    public function test_user_devuelve_el_usuario_autenticado(): void
    {
        $user = $this->user();

        $this->actingAsApi($user)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', $user->email);
    }

    public function test_endpoints_protegidos_rechazan_sin_token(): void
    {
        $this->getJson('/api/lists')->assertUnauthorized();
        $this->getJson('/api/pantry')->assertUnauthorized();
        $this->getJson('/api/products')->assertUnauthorized();
    }

    public function test_logout_revoca_el_token(): void
    {
        $user = $this->user();
        $token = $user->createToken('tests')->plainTextToken;

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_providers_informa_si_google_esta_configurado(): void
    {
        config(['services.google.client_id' => null]);
        $this->getJson('/api/auth/providers')->assertOk()->assertJson(['google' => false]);

        config(['services.google.client_id' => 'algo']);
        $this->getJson('/api/auth/providers')->assertOk()->assertJson(['google' => true]);
    }
}
