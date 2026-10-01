<?php

namespace Tests\Feature\Api;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileApiTest extends ApiTestCase
{
    public function test_actualiza_el_nombre(): void
    {
        $user = $this->user();

        $this->actingAsApi($user)
            ->patchJson('/api/profile', ['name' => 'Nuevo Nombre'])
            ->assertOk()
            ->assertJsonPath('name', 'Nuevo Nombre');
    }

    public function test_cambia_la_contrasena_con_la_actual_correcta(): void
    {
        $user = $this->user(['password' => Hash::make('vieja-clave-1')]);

        $this->actingAsApi($user)
            ->putJson('/api/profile/password', [
                'current_password' => 'vieja-clave-1',
                'password' => 'nueva-clave-22',
                'password_confirmation' => 'nueva-clave-22',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('nueva-clave-22', $user->fresh()->password));
    }

    public function test_rechaza_contrasena_actual_incorrecta_y_confirmacion_que_no_coincide(): void
    {
        $user = $this->user(['password' => Hash::make('vieja-clave-1')]);

        $this->actingAsApi($user)
            ->putJson('/api/profile/password', [
                'current_password' => 'incorrecta',
                'password' => 'nueva-clave-22',
                'password_confirmation' => 'nueva-clave-22',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->actingAsApi($user)
            ->putJson('/api/profile/password', [
                'current_password' => 'vieja-clave-1',
                'password' => 'nueva-clave-22',
                'password_confirmation' => 'otra-cosa',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }

    public function test_cuenta_google_sin_contrasena_puede_crear_una(): void
    {
        $user = $this->user(['password' => null, 'google_id' => 'g-1']);

        $this->actingAsApi($user)
            ->putJson('/api/profile/password', [
                'password' => 'primera-clave-1',
                'password_confirmation' => 'primera-clave-1',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('primera-clave-1', $user->fresh()->password));
    }

    public function test_sube_avatar(): void
    {
        Storage::fake('public');
        $user = $this->user();

        $this->actingAsApi($user)
            ->postJson('/api/profile/avatar', [
                'avatar' => UploadedFile::fake()->image('yo.jpg', 200, 200),
            ])
            ->assertOk()
            ->assertJsonStructure(['avatar_url']);

        $this->assertNotNull($user->fresh()->avatar_path);
        Storage::disk('public')->assertExists($user->fresh()->avatar_path);
    }
}
