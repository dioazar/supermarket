<?php

namespace Tests\Feature\Api;

use App\Models\Category;

class CategoryApiTest extends ApiTestCase
{
    public function test_index_solo_devuelve_categorias_propias(): void
    {
        $user = $this->user();
        $other = $this->user();
        Category::create(['user_id' => $user->id, 'name' => 'Lácteos']);
        Category::create(['user_id' => $other->id, 'name' => 'Ajena']);

        $this->actingAsApi($user)
            ->getJson('/api/categories')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Lácteos');
    }

    public function test_store_crea_raiz_y_subcategoria(): void
    {
        $user = $this->user();

        $rootId = $this->actingAsApi($user)
            ->postJson('/api/categories', ['name' => 'Bebidas'])
            ->assertCreated()
            ->json('id');

        $this->actingAsApi($user)
            ->postJson('/api/categories', ['name' => 'Cervezas', 'parent_id' => $rootId])
            ->assertCreated()
            ->assertJsonPath('parent_id', $rootId);
    }

    public function test_no_permite_subcategoria_de_subcategoria(): void
    {
        $user = $this->user();
        $root = Category::create(['user_id' => $user->id, 'name' => 'Bebidas']);
        $sub = Category::create(['user_id' => $user->id, 'name' => 'Cervezas', 'parent_id' => $root->id]);

        // El padre tiene que ser una categoría raíz: máximo dos niveles.
        $this->actingAsApi($user)
            ->postJson('/api/categories', ['name' => 'IPAs', 'parent_id' => $sub->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_no_permite_padre_de_otro_usuario(): void
    {
        $user = $this->user();
        $other = $this->user();
        $foreignRoot = Category::create(['user_id' => $other->id, 'name' => 'Ajena']);

        $this->actingAsApi($user)
            ->postJson('/api/categories', ['name' => 'Mía', 'parent_id' => $foreignRoot->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_update_renombra_categoria_propia(): void
    {
        $user = $this->user();
        $category = Category::create(['user_id' => $user->id, 'name' => 'Bebidas']);

        $this->actingAsApi($user)
            ->patchJson("/api/categories/{$category->id}", ['name' => 'Bebidas frías'])
            ->assertOk()
            ->assertJsonPath('name', 'Bebidas frías');
    }

    public function test_una_categoria_con_hijas_no_puede_volverse_subcategoria(): void
    {
        $user = $this->user();
        $root = Category::create(['user_id' => $user->id, 'name' => 'Bebidas']);
        Category::create(['user_id' => $user->id, 'name' => 'Cervezas', 'parent_id' => $root->id]);
        $otherRoot = Category::create(['user_id' => $user->id, 'name' => 'Almacén']);

        $this->actingAsApi($user)
            ->patchJson("/api/categories/{$root->id}", [
                'name' => 'Bebidas',
                'parent_id' => $otherRoot->id,
            ])
            ->assertUnprocessable();
    }

    public function test_update_y_destroy_rechazan_categoria_ajena(): void
    {
        $user = $this->user();
        $other = $this->user();
        $category = Category::create(['user_id' => $other->id, 'name' => 'Ajena']);

        $this->actingAsApi($user)
            ->patchJson("/api/categories/{$category->id}", ['name' => 'Hackeada'])
            ->assertForbidden();

        $this->actingAsApi($user)
            ->deleteJson("/api/categories/{$category->id}")
            ->assertForbidden();
    }

    public function test_destroy_elimina_categoria_propia(): void
    {
        $user = $this->user();
        $category = Category::create(['user_id' => $user->id, 'name' => 'Bebidas']);

        $this->actingAsApi($user)
            ->deleteJson("/api/categories/{$category->id}")
            ->assertOk();

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }
}
