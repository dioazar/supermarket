<?php

namespace Tests\Feature\Api;

use App\Models\PantryItem;
use App\Models\Product;
use App\Services\ListSharing;

class ListItemApiTest extends ApiTestCase
{
    public function test_agregar_item_por_id_de_producto_propio(): void
    {
        $owner = $this->user();
        $list = $this->makeList($owner);
        $product = $this->productFor($owner, 'Leche');

        $this->actingAsApi($owner)
            ->postJson("/api/lists/{$list->id}/items", ['product_id' => $product->id, 'quantity' => 2])
            ->assertCreated()
            ->assertJsonPath('product.name', 'Leche');
    }

    public function test_agregar_item_con_producto_ajeno_da_404(): void
    {
        $owner = $this->user();
        $other = $this->user();
        $list = $this->makeList($owner);
        $foreign = $this->productFor($other, 'Cerveza');

        $this->actingAsApi($owner)
            ->postJson("/api/lists/{$list->id}/items", ['product_id' => $foreign->id])
            ->assertNotFound();
    }

    public function test_agregar_item_por_nombre_crea_producto_del_que_agrega(): void
    {
        $owner = $this->user();
        $editor = $this->user();
        $list = $this->makeList($owner);
        ListSharing::setRole($editor, $list, 'list-editor');

        $this->actingAsApi($editor)
            ->postJson("/api/lists/{$list->id}/items", ['product_name' => 'Pan lactal'])
            ->assertCreated();

        $this->assertNotNull(Product::ownedBy($editor)->where('name', 'Pan lactal')->first());
        $this->assertNull(Product::ownedBy($owner)->where('name', 'Pan lactal')->first());
    }

    public function test_producto_equivalente_de_otro_miembro_no_duplica_el_item(): void
    {
        $owner = $this->user();
        $editor = $this->user();
        $list = $this->makeList($owner);
        ListSharing::setRole($editor, $list, 'list-editor');

        $this->actingAsApi($owner)
            ->postJson("/api/lists/{$list->id}/items", ['product_name' => 'Leche', 'quantity' => 1])
            ->assertCreated();

        // El editor agrega "LECHE" con su propio vocabulario: pisa el ítem existente.
        $this->actingAsApi($editor)
            ->postJson("/api/lists/{$list->id}/items", ['product_name' => 'LECHE', 'quantity' => 3])
            ->assertCreated();

        $this->assertSame(1, $list->items()->count());
        $this->assertEquals(3.0, (float) $list->items()->first()->quantity);
    }

    public function test_viewer_no_puede_agregar_items(): void
    {
        $owner = $this->user();
        $viewer = $this->user();
        $list = $this->makeList($owner);
        ListSharing::setRole($viewer, $list, 'list-viewer');

        $this->actingAsApi($viewer)
            ->postJson("/api/lists/{$list->id}/items", ['product_name' => 'Leche'])
            ->assertForbidden();
    }

    public function test_marcar_comprado_suma_a_la_despensa_del_que_compra(): void
    {
        $owner = $this->user();
        $editor = $this->user();
        $list = $this->makeList($owner);
        ListSharing::setRole($editor, $list, 'list-editor');
        $item = $list->items()->create([
            'product_id' => $this->productFor($owner, 'Leche')->id,
            'quantity' => 2,
            'added_by' => $owner->id,
        ]);

        $this->actingAsApi($editor)
            ->patchJson("/api/items/{$item->id}", ['status' => 'checked'])
            ->assertOk()
            ->assertJsonPath('status', 'checked');

        $pantry = PantryItem::where('user_id', $editor->id)->where('product_id', $item->product_id)->first();
        $this->assertNotNull($pantry);
        $this->assertEquals(2.0, $pantry->quantity);

        // Desmarcar revierte la despensa.
        $this->actingAsApi($editor)
            ->patchJson("/api/items/{$item->id}", ['status' => 'pending'])
            ->assertOk();

        $this->assertEquals(0.0, $pantry->fresh()->quantity);
    }

    public function test_actualizar_cantidad_y_borrar_item(): void
    {
        $owner = $this->user();
        $list = $this->makeList($owner);
        $item = $list->items()->create([
            'product_id' => $this->productFor($owner, 'Leche')->id,
            'quantity' => 1,
            'added_by' => $owner->id,
        ]);

        $this->actingAsApi($owner)
            ->patchJson("/api/items/{$item->id}", ['quantity' => 4])
            ->assertOk()
            ->assertJsonPath('quantity', fn ($q) => (float) $q === 4.0);

        $this->actingAsApi($owner)
            ->deleteJson("/api/items/{$item->id}")
            ->assertOk();

        $this->assertDatabaseMissing('list_items', ['id' => $item->id]);
    }

    public function test_extrano_no_puede_tocar_items(): void
    {
        $owner = $this->user();
        $stranger = $this->user();
        $list = $this->makeList($owner);
        $item = $list->items()->create([
            'product_id' => $this->productFor($owner, 'Leche')->id,
            'quantity' => 1,
            'added_by' => $owner->id,
        ]);

        $this->actingAsApi($stranger)
            ->patchJson("/api/items/{$item->id}", ['status' => 'checked'])
            ->assertForbidden();

        $this->actingAsApi($stranger)
            ->deleteJson("/api/items/{$item->id}")
            ->assertForbidden();
    }
}
