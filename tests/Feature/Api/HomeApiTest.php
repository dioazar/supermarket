<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\PantryItem;
use App\Models\Store;

class HomeApiTest extends ApiTestCase
{
    public function test_home_arma_despensa_tiendas_con_precios_y_categorias(): void
    {
        $user = $this->user();
        $category = Category::create(['user_id' => $user->id, 'name' => 'Lácteos']);
        $leche = $this->productFor($user, 'Leche');
        PantryItem::create([
            'user_id' => $user->id,
            'product_id' => $leche->id,
            'category_id' => $category->id,
            'quantity' => 0,
            'min_quantity' => 2,
        ]);

        $store = Store::create(['user_id' => $user->id, 'name' => 'Coto']);
        $store->products()->attach($leche->id, [
            'price' => 1500,
            'sale_price' => 1200,
            'sale_ends_at' => now()->addDay()->toDateString(),
        ]);

        $this->actingAsApi($user)
            ->getJson('/api/home')
            ->assertOk()
            ->assertJsonCount(1, 'pantry')
            ->assertJsonPath('pantry.0.status', 'red')
            ->assertJsonPath('pantry.0.product.name', 'Leche')
            ->assertJsonPath('stores.0.name', 'Coto')
            ->assertJsonPath("stores.0.prices.{$leche->id}.price", 1200)
            ->assertJsonPath("stores.0.prices.{$leche->id}.on_sale", true)
            ->assertJsonPath('categories.0.name', 'Lácteos');
    }

    public function test_oferta_vencida_usa_precio_de_lista(): void
    {
        $user = $this->user();
        $leche = $this->productFor($user, 'Leche');
        $store = Store::create(['user_id' => $user->id, 'name' => 'Coto']);
        $store->products()->attach($leche->id, [
            'price' => 1500,
            'sale_price' => 1200,
            'sale_ends_at' => now()->subDay()->toDateString(),
        ]);

        $this->actingAsApi($user)
            ->getJson('/api/home')
            ->assertOk()
            ->assertJsonPath("stores.0.prices.{$leche->id}.price", 1500)
            ->assertJsonPath("stores.0.prices.{$leche->id}.on_sale", false);
    }
}
