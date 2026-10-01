<?php

namespace Tests\Feature\Api;

use App\Services\ListSharing;

class ShareApiTest extends ApiTestCase
{
    public function test_el_dueno_comparte_con_editor_y_viewer(): void
    {
        $owner = $this->user();
        $friend = $this->user(['email' => 'amiga@test.com']);
        $list = $this->makeList($owner);

        $response = $this->actingAsApi($owner)
            ->postJson("/api/lists/{$list->id}/share", [
                'email' => 'amiga@test.com',
                'role' => 'list-editor',
            ])
            ->assertOk();

        $members = collect($response->json())->keyBy('email');
        $this->assertSame('list-editor', $members['amiga@test.com']['role']);
        $this->assertSame('list-editor', ListSharing::roleOn($friend, $list));

        // Re-compartir con otro rol lo actualiza (upsert).
        $this->actingAsApi($owner)
            ->postJson("/api/lists/{$list->id}/share", [
                'email' => 'amiga@test.com',
                'role' => 'list-viewer',
            ])
            ->assertOk();

        $this->assertSame('list-viewer', ListSharing::roleOn($friend, $list));
    }

    public function test_no_se_puede_compartir_con_el_dueno(): void
    {
        $owner = $this->user();
        $list = $this->makeList($owner);

        $this->actingAsApi($owner)
            ->postJson("/api/lists/{$list->id}/share", [
                'email' => $owner->email,
                'role' => 'list-editor',
            ])
            ->assertUnprocessable();
    }

    public function test_un_editor_no_puede_compartir(): void
    {
        $owner = $this->user();
        $editor = $this->user();
        $target = $this->user(['email' => 'target@test.com']);
        $list = $this->makeList($owner);
        ListSharing::setRole($editor, $list, 'list-editor');

        $this->actingAsApi($editor)
            ->postJson("/api/lists/{$list->id}/share", [
                'email' => 'target@test.com',
                'role' => 'list-editor',
            ])
            ->assertForbidden();
    }

    public function test_quitar_miembro_pero_no_al_dueno(): void
    {
        $owner = $this->user();
        $friend = $this->user();
        $list = $this->makeList($owner);
        ListSharing::setRole($friend, $list, 'list-editor');

        $this->actingAsApi($owner)
            ->deleteJson("/api/lists/{$list->id}/share/{$friend->id}")
            ->assertOk();

        $this->assertNull(ListSharing::roleOn($friend, $list));

        $this->actingAsApi($owner)
            ->deleteJson("/api/lists/{$list->id}/share/{$owner->id}")
            ->assertUnprocessable();
    }

    public function test_friends_lista_gente_con_listas_en_comun(): void
    {
        $owner = $this->user();
        $friend = $this->user();
        $unrelated = $this->user();
        $list = $this->makeList($owner);
        ListSharing::setRole($friend, $list, 'list-viewer');

        $emails = collect(
            $this->actingAsApi($owner)->getJson('/api/friends')->assertOk()->json()
        )->pluck('email');

        $this->assertTrue($emails->contains($friend->email));
        $this->assertFalse($emails->contains($unrelated->email));
    }
}
