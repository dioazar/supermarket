<?php

namespace Tests\Feature\Api;

use App\Services\ListSharing;

class ListApiTest extends ApiTestCase
{
    public function test_index_muestra_listas_propias_y_compartidas_con_rol(): void
    {
        $owner = $this->user();
        $guest = $this->user();
        $list = $this->makeList($owner, 'Semanal');
        ListSharing::setRole($guest, $list, 'list-editor');
        $this->makeList($guest, 'Solo mía');

        $response = $this->actingAsApi($guest)->getJson('/api/lists')->assertOk()->assertJsonCount(2);

        $byName = collect($response->json())->keyBy('name');
        $this->assertSame('list-editor', $byName['Semanal']['my_role']);
        $this->assertSame('list-owner', $byName['Solo mía']['my_role']);
    }

    public function test_store_crea_lista_y_asigna_rol_de_dueno(): void
    {
        $user = $this->user();

        $id = $this->actingAsApi($user)
            ->postJson('/api/lists', ['name' => 'Asado', 'recurrence_days' => 7])
            ->assertCreated()
            ->assertJsonPath('name', 'Asado')
            ->json('id');

        $list = \App\Models\ShoppingList::findOrFail($id);
        $this->assertSame('list-owner', ListSharing::roleOn($user, $list));
        $this->assertNotNull($list->next_recurrence_at);
    }

    public function test_show_incluye_items_miembros_y_permisos(): void
    {
        $owner = $this->user();
        $list = $this->makeList($owner);
        $list->items()->create([
            'product_id' => $this->productFor($owner, 'Leche')->id,
            'quantity' => 2,
            'added_by' => $owner->id,
        ]);

        $this->actingAsApi($owner)
            ->getJson("/api/lists/{$list->id}")
            ->assertOk()
            ->assertJsonPath('list.name', $list->name)
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.product.name', 'Leche')
            ->assertJsonPath('my_role', 'list-owner')
            ->assertJsonPath('can.edit', true)
            ->assertJsonPath('can.delete', true);
    }

    public function test_show_rechaza_a_un_extrano(): void
    {
        $owner = $this->user();
        $stranger = $this->user();
        $list = $this->makeList($owner);

        $this->actingAsApi($stranger)
            ->getJson("/api/lists/{$list->id}")
            ->assertForbidden();
    }

    public function test_update_permite_editor_pero_no_viewer(): void
    {
        $owner = $this->user();
        $editor = $this->user();
        $viewer = $this->user();
        $list = $this->makeList($owner);
        ListSharing::setRole($editor, $list, 'list-editor');
        ListSharing::setRole($viewer, $list, 'list-viewer');

        $this->actingAsApi($editor)
            ->patchJson("/api/lists/{$list->id}", ['name' => 'Renombrada', 'recurrence_days' => 3])
            ->assertOk()
            ->assertJsonPath('name', 'Renombrada');

        $this->actingAsApi($viewer)
            ->patchJson("/api/lists/{$list->id}", ['name' => 'No puedo'])
            ->assertForbidden();
    }

    public function test_destroy_solo_para_el_dueno(): void
    {
        $owner = $this->user();
        $editor = $this->user();
        $list = $this->makeList($owner);
        ListSharing::setRole($editor, $list, 'list-editor');

        $this->actingAsApi($editor)
            ->deleteJson("/api/lists/{$list->id}")
            ->assertForbidden();

        $this->actingAsApi($owner)
            ->deleteJson("/api/lists/{$list->id}")
            ->assertOk();

        $this->assertDatabaseMissing('shopping_lists', ['id' => $list->id]);
    }

    public function test_reset_vuelve_todo_a_pendiente_sin_tocar_la_despensa(): void
    {
        $owner = $this->user();
        $list = $this->makeList($owner);
        $product = $this->productFor($owner, 'Leche');
        $item = $list->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'added_by' => $owner->id,
            'status' => 'checked',
            'checked_at' => now(),
        ]);
        $pantry = \App\Models\PantryItem::create([
            'user_id' => $owner->id,
            'product_id' => $product->id,
            'quantity' => 5,
            'min_quantity' => 1,
        ]);

        $this->actingAsApi($owner)
            ->postJson("/api/lists/{$list->id}/reset")
            ->assertOk();

        $this->assertSame('pending', $item->fresh()->status);
        $this->assertNull($item->fresh()->checked_at);
        $this->assertEquals(5.0, $pantry->fresh()->quantity);
    }
}
