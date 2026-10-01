<?php

namespace Tests\Feature\Api;

use App\Models\Product;
use App\Models\Store;

class StoreApiTest extends ApiTestCase
{
    public function test_index_lista_solo_tiendas_propias(): void
    {
        $user = $this->user();
        $other = $this->user();
        Store::create(['user_id' => $user->id, 'name' => 'Coto']);
        Store::create(['user_id' => $other->id, 'name' => 'Ajena']);

        $this->actingAsApi($user)
            ->getJson('/api/stores')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Coto');
    }

    public function test_store_crea_tienda_con_geo_y_web(): void
    {
        $user = $this->user();

        $this->actingAsApi($user)
            ->postJson('/api/stores', [
                'name' => 'Día',
                'address' => 'Monroe 2801',
                'lat' => -34.55,
                'lng' => -58.46,
                'website' => 'https://dia.com.ar',
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Día');

        $this->assertDatabaseHas('stores', ['user_id' => $user->id, 'name' => 'Día']);
    }

    public function test_attach_producto_con_precio_y_oferta(): void
    {
        $user = $this->user();
        $store = Store::create(['user_id' => $user->id, 'name' => 'Coto']);
        $product = $this->productFor($user, 'Leche');

        $this->actingAsApi($user)
            ->postJson("/api/stores/{$store->id}/products", [
                'product_id' => $product->id,
                'price' => 1500,
                'sale_price' => 1200,
                'sale_ends_at' => now()->addDays(3)->toDateString(),
            ])
            ->assertOk();

        $pivot = $store->products()->first()->pivot;
        $this->assertEquals(1500, $pivot->price);
        $this->assertEquals(1200, $pivot->sale_price);
    }

    public function test_attach_por_nombre_crea_producto_propio_y_rechaza_ajenos(): void
    {
        $user = $this->user();
        $other = $this->user();
        $store = Store::create(['user_id' => $user->id, 'name' => 'Coto']);
        $foreign = $this->productFor($other, 'Cerveza');

        $this->actingAsApi($user)
            ->postJson("/api/stores/{$store->id}/products", [
                'product_name' => 'Galletitas',
                'price' => 900,
            ])
            ->assertOk();

        $this->assertNotNull(Product::ownedBy($user)->where('name', 'Galletitas')->first());

        $this->actingAsApi($user)
            ->postJson("/api/stores/{$store->id}/products", ['product_id' => $foreign->id])
            ->assertNotFound();
    }

    public function test_detach_producto(): void
    {
        $user = $this->user();
        $store = Store::create(['user_id' => $user->id, 'name' => 'Coto']);
        $product = $this->productFor($user, 'Leche');
        $store->products()->attach($product->id, ['price' => 1000]);

        $this->actingAsApi($user)
            ->deleteJson("/api/stores/{$store->id}/products/{$product->id}")
            ->assertOk();

        $this->assertSame(0, $store->products()->count());
    }

    public function test_operaciones_sobre_tienda_ajena_dan_403(): void
    {
        $user = $this->user();
        $other = $this->user();
        $store = Store::create(['user_id' => $other->id, 'name' => 'Ajena']);

        $this->actingAsApi($user)
            ->postJson("/api/stores/{$store->id}/products", ['product_name' => 'Leche'])
            ->assertForbidden();

        $this->actingAsApi($user)
            ->deleteJson("/api/stores/{$store->id}")
            ->assertForbidden();
    }

    public function test_destroy_borra_tienda_propia(): void
    {
        $user = $this->user();
        $store = Store::create(['user_id' => $user->id, 'name' => 'Coto']);

        $this->actingAsApi($user)->deleteJson("/api/stores/{$store->id}")->assertOk();

        $this->assertDatabaseMissing('stores', ['id' => $store->id]);
    }
}
