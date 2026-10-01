<?php

namespace Tests\Feature\Api;

use App\Models\PantryItem;
use App\Models\Store;

class RecommendationApiTest extends ApiTestCase
{
    public function test_recomienda_tiendas_por_cobertura_y_precio(): void
    {
        $user = $this->user();
        $leche = $this->productFor($user, 'Leche');
        $arroz = $this->productFor($user, 'Arroz');

        // Faltantes: leche (0 de 2) y arroz (0 de 1).
        PantryItem::create(['user_id' => $user->id, 'product_id' => $leche->id, 'quantity' => 0, 'min_quantity' => 2]);
        PantryItem::create(['user_id' => $user->id, 'product_id' => $arroz->id, 'quantity' => 0, 'min_quantity' => 1]);

        // Coto cubre los dos; Día solo la leche (más barata, pero cubre menos).
        $coto = Store::create(['user_id' => $user->id, 'name' => 'Coto']);
        $coto->products()->attach($leche->id, ['price' => 1500]);
        $coto->products()->attach($arroz->id, ['price' => 2000]);
        $dia = Store::create(['user_id' => $user->id, 'name' => 'Día']);
        $dia->products()->attach($leche->id, ['price' => 1300]);

        $response = $this->actingAsApi($user)
            ->getJson('/api/recommendations')
            ->assertOk()
            ->assertJsonCount(2, 'missing')
            ->assertJsonCount(2, 'stores');

        // Gana la cobertura: Coto (2 productos) antes que Día (1).
        $response->assertJsonPath('stores.0.name', 'Coto')
            ->assertJsonPath('stores.0.covered', 2)
            ->assertJsonPath('stores.1.name', 'Día')
            ->assertJsonPath('stores.1.missing_products.0', 'Arroz');
    }

    public function test_las_ofertas_vigentes_bajan_el_total_estimado(): void
    {
        $user = $this->user();
        $leche = $this->productFor($user, 'Leche');
        PantryItem::create(['user_id' => $user->id, 'product_id' => $leche->id, 'quantity' => 0, 'min_quantity' => 1]);

        $store = Store::create(['user_id' => $user->id, 'name' => 'Coto']);
        $store->products()->attach($leche->id, [
            'price' => 1500,
            'sale_price' => 1000,
            'sale_ends_at' => now()->addDays(2)->toDateString(),
        ]);

        $this->actingAsApi($user)
            ->getJson('/api/recommendations')
            ->assertOk()
            ->assertJsonPath('stores.0.offers_count', 1)
            ->assertJsonPath('stores.0.covered_products.0.on_sale', true)
            ->assertJsonPath('stores.0.covered_products.0.price', 1000)
            ->assertJsonPath('offers.0.product', 'Leche');
    }

    public function test_incluye_pendientes_de_listas_como_faltantes(): void
    {
        $user = $this->user();
        $list = $this->makeList($user);
        $list->items()->create([
            'product_id' => $this->productFor($user, 'Fideos')->id,
            'quantity' => 3,
            'added_by' => $user->id,
        ]);

        $this->actingAsApi($user)
            ->getJson('/api/recommendations')
            ->assertOk()
            ->assertJsonPath('missing.0.name', 'Fideos')
            ->assertJsonPath('missing.0.sources.0', 'listas');
    }
}
