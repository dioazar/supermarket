<?php

namespace Tests\Feature\Api;

use App\Services\ListSharing;

class ExpenseApiTest extends ApiTestCase
{
    public function test_reparte_gastos_entre_miembros_y_simplifica_transferencias(): void
    {
        $owner = $this->user(['name' => 'María']);
        $friend = $this->user(['name' => 'Juan']);
        $list = $this->makeList($owner);
        ListSharing::setRole($friend, $list, 'list-editor');

        $this->actingAsApi($owner)
            ->postJson("/api/lists/{$list->id}/expenses", ['amount' => 3000, 'note' => 'Súper'])
            ->assertCreated();

        $settle = $this->actingAsApi($friend)
            ->postJson("/api/lists/{$list->id}/expenses", ['amount' => 1000])
            ->assertCreated()
            ->json();

        // Total 4000, mitad cada uno: Juan puso 1000, debe 1000 a María.
        $this->assertEquals(4000, $settle['total']);
        $this->assertEquals(2000, $settle['share']);
        $this->assertCount(1, $settle['transfers']);
        $this->assertSame('Juan', $settle['transfers'][0]['from']);
        $this->assertSame('María', $settle['transfers'][0]['to']);
        $this->assertEquals(1000, $settle['transfers'][0]['amount']);
    }

    public function test_solo_el_autor_o_el_dueno_pueden_borrar_un_gasto(): void
    {
        $owner = $this->user();
        $friend = $this->user();
        $other = $this->user();
        $list = $this->makeList($owner);
        ListSharing::setRole($friend, $list, 'list-editor');
        ListSharing::setRole($other, $list, 'list-editor');

        $expense = $list->expenses()->create(['user_id' => $friend->id, 'amount' => 500]);

        $this->actingAsApi($other)
            ->deleteJson("/api/expenses/{$expense->id}")
            ->assertForbidden();

        $this->actingAsApi($friend)
            ->deleteJson("/api/expenses/{$expense->id}")
            ->assertOk();

        $this->assertDatabaseMissing('expenses', ['id' => $expense->id]);
    }

    public function test_un_extrano_no_puede_cargar_gastos(): void
    {
        $owner = $this->user();
        $stranger = $this->user();
        $list = $this->makeList($owner);

        $this->actingAsApi($stranger)
            ->postJson("/api/lists/{$list->id}/expenses", ['amount' => 100])
            ->assertForbidden();
    }
}
