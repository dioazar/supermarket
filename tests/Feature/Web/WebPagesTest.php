<?php

namespace Tests\Feature\Web;

use App\Models\PantryItem;
use App\Models\Store;
use App\Models\User;
use App\Services\ListSharing;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Smoke tests: cada página Inertia carga con datos del usuario. */
class WebPagesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->user = User::factory()->create();
    }

    public function test_la_raiz_redirige_al_login(): void
    {
        $this->get('/')->assertRedirect(route('login'));
    }

    public function test_paginas_protegidas_redirigen_a_login_sin_sesion(): void
    {
        foreach (['/dashboard', '/lists', '/pantry', '/stores', '/products', '/categories', '/recommendations'] as $path) {
            $this->get($path)->assertRedirect(route('login'));
        }
    }

    public function test_dashboard(): void
    {
        $this->actingAs($this->user)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Dashboard'));
    }

    public function test_listas_index_y_detalle(): void
    {
        $list = \App\Models\ShoppingList::create(['owner_id' => $this->user->id, 'name' => 'Semanal']);
        ListSharing::setRole($this->user, $list, 'list-owner');

        $this->actingAs($this->user)
            ->get('/lists')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Lists/Index')
                ->has('lists', 1));

        $this->actingAs($this->user)
            ->get("/lists/{$list->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Lists/Show')
                ->where('myRole', 'list-owner')
                ->has('items')
                ->has('products'));
    }

    public function test_despensa_con_items(): void
    {
        $product = \App\Models\Product::findOrCreateFor($this->user, 'Leche');
        PantryItem::create([
            'user_id' => $this->user->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'min_quantity' => 2,
        ]);

        $this->actingAs($this->user)
            ->get('/pantry')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Pantry/Index')
                ->has('items', 1)
                ->where('items.0.status', 'yellow'));
    }

    public function test_tiendas_productos_categorias_y_recomendaciones(): void
    {
        Store::create(['user_id' => $this->user->id, 'name' => 'Coto']);
        \App\Models\Product::findOrCreateFor($this->user, 'Leche');
        \App\Models\Category::create(['user_id' => $this->user->id, 'name' => 'Lácteos']);

        $this->actingAs($this->user)
            ->get('/stores')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Stores/Index')->has('stores', 1));

        $this->actingAs($this->user)
            ->get('/products')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Products/Index')->has('products', 1));

        $this->actingAs($this->user)
            ->get('/categories')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Categories/Index'));

        $this->actingAs($this->user)
            ->get('/recommendations')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Recommendations/Index'));
    }

    public function test_una_lista_ajena_da_403_en_la_web(): void
    {
        $other = User::factory()->create();
        $list = \App\Models\ShoppingList::create(['owner_id' => $other->id, 'name' => 'Ajena']);
        ListSharing::setRole($other, $list, 'list-owner');

        $this->actingAs($this->user)->get("/lists/{$list->id}")->assertForbidden();
    }
}
