<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\PantryItem;
use App\Models\Product;

class PantryApiTest extends ApiTestCase
{
    public function test_index_devuelve_solo_la_despensa_propia_con_semaforo(): void
    {
        $user = $this->user();
        $other = $this->user();

        PantryItem::create([
            'user_id' => $user->id,
            'product_id' => $this->productFor($user, 'Leche')->id,
            'quantity' => 0,
            'min_quantity' => 2,
        ]);
        PantryItem::create([
            'user_id' => $user->id,
            'product_id' => $this->productFor($user, 'Arroz')->id,
            'quantity' => 1,
            'min_quantity' => 2,
        ]);
        PantryItem::create([
            'user_id' => $user->id,
            'product_id' => $this->productFor($user, 'Yerba')->id,
            'quantity' => 3,
            'min_quantity' => 1,
        ]);
        PantryItem::create([
            'user_id' => $other->id,
            'product_id' => $this->productFor($other, 'Ajeno')->id,
            'quantity' => 1,
            'min_quantity' => 1,
        ]);

        $response = $this->actingAsApi($user)->getJson('/api/pantry')->assertOk();

        $byName = collect($response->json())->keyBy('product.name');
        $this->assertCount(3, $byName);
        $this->assertSame('red', $byName['Leche']['status']);
        $this->assertSame('yellow', $byName['Arroz']['status']);
        $this->assertSame('green', $byName['Yerba']['status']);
    }

    public function test_store_con_producto_existente_propio(): void
    {
        $user = $this->user();
        $product = $this->productFor($user, 'Leche');

        $this->actingAsApi($user)
            ->postJson('/api/pantry', [
                'product_id' => $product->id,
                'quantity' => 2,
                'min_quantity' => 1,
            ])
            ->assertCreated()
            ->assertJsonPath('product.name', 'Leche');
    }

    public function test_store_rechaza_producto_ajeno(): void
    {
        $user = $this->user();
        $other = $this->user();
        $foreign = $this->productFor($other, 'Cerveza');

        $this->actingAsApi($user)
            ->postJson('/api/pantry', [
                'product_id' => $foreign->id,
                'quantity' => 1,
            ])
            ->assertNotFound();
    }

    public function test_store_con_nombre_crea_el_producto_del_usuario(): void
    {
        $user = $this->user();

        $this->actingAsApi($user)
            ->postJson('/api/pantry', [
                'product_name' => 'Dulce de leche',
                'quantity' => 1,
            ])
            ->assertCreated();

        $this->assertNotNull(Product::ownedBy($user)->where('name', 'Dulce de leche')->first());
    }

    public function test_store_crea_categoria_inline(): void
    {
        $user = $this->user();

        $this->actingAsApi($user)
            ->postJson('/api/pantry', [
                'product_name' => 'Lavandina',
                'quantity' => 1,
                'category_name' => 'Limpieza',
            ])
            ->assertCreated();

        $category = Category::where('user_id', $user->id)->where('name', 'Limpieza')->first();
        $this->assertNotNull($category);
        $this->assertSame($category->id, PantryItem::where('user_id', $user->id)->first()->category_id);
    }

    public function test_update_ajusta_cantidades(): void
    {
        $user = $this->user();
        $item = PantryItem::create([
            'user_id' => $user->id,
            'product_id' => $this->productFor($user, 'Leche')->id,
            'quantity' => 1,
            'min_quantity' => 1,
        ]);

        $this->actingAsApi($user)
            ->patchJson("/api/pantry/{$item->id}", ['quantity' => 5, 'min_quantity' => 2])
            ->assertOk();

        $this->assertEquals(5.0, $item->fresh()->quantity);
        $this->assertEquals(2.0, $item->fresh()->min_quantity);
    }

    public function test_update_y_destroy_rechazan_item_ajeno(): void
    {
        $user = $this->user();
        $other = $this->user();
        $item = PantryItem::create([
            'user_id' => $other->id,
            'product_id' => $this->productFor($other, 'Cerveza')->id,
            'quantity' => 1,
            'min_quantity' => 1,
        ]);

        $this->actingAsApi($user)
            ->patchJson("/api/pantry/{$item->id}", ['quantity' => 99])
            ->assertForbidden();

        $this->actingAsApi($user)
            ->deleteJson("/api/pantry/{$item->id}")
            ->assertForbidden();
    }

    public function test_destroy_borra_item_propio(): void
    {
        $user = $this->user();
        $item = PantryItem::create([
            'user_id' => $user->id,
            'product_id' => $this->productFor($user, 'Leche')->id,
            'quantity' => 1,
            'min_quantity' => 1,
        ]);

        $this->actingAsApi($user)->deleteJson("/api/pantry/{$item->id}")->assertOk();

        $this->assertDatabaseMissing('pantry_items', ['id' => $item->id]);
    }
}
