<?php

namespace Tests\Feature\Web;

use App\Models\PantryItem;
use App\Models\Product;
use App\Models\User;
use App\Services\ListSharing;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Las acciones web (Inertia) comparten reglas con la API: se cubren las claves. */
class WebActionsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->user = User::factory()->create();
    }

    public function test_crear_lista_agregar_item_y_marcarlo_comprado(): void
    {
        $this->actingAs($this->user)
            ->post('/lists', ['name' => 'Semanal', 'recurrence_days' => 7])
            ->assertRedirect();

        $list = \App\Models\ShoppingList::where('owner_id', $this->user->id)->firstOrFail();
        $this->assertSame('list-owner', ListSharing::roleOn($this->user, $list));

        $this->actingAs($this->user)
            ->post("/lists/{$list->id}/items", ['product_name' => 'Leche', 'quantity' => 2])
            ->assertRedirect();

        $item = $list->items()->firstOrFail();
        $this->assertSame('Leche', $item->product->name);
        $this->assertSame($this->user->id, $item->product->user_id);

        // Marcar comprado suma a la despensa del que compra.
        $this->actingAs($this->user)
            ->patch("/items/{$item->id}", ['status' => 'checked'])
            ->assertRedirect();

        $pantry = PantryItem::where('user_id', $this->user->id)
            ->where('product_id', $item->product_id)
            ->firstOrFail();
        $this->assertEquals(2.0, $pantry->quantity);
    }

    public function test_compartir_lista_desde_la_web(): void
    {
        $friend = User::factory()->create(['email' => 'amiga@test.com']);
        $list = \App\Models\ShoppingList::create(['owner_id' => $this->user->id, 'name' => 'Semanal']);
        ListSharing::setRole($this->user, $list, 'list-owner');

        $this->actingAs($this->user)
            ->post("/lists/{$list->id}/share", ['email' => 'amiga@test.com', 'role' => 'list-editor'])
            ->assertRedirect();

        $this->assertSame('list-editor', ListSharing::roleOn($friend, $list));
    }

    public function test_alta_de_producto_con_imagen_desde_la_web(): void
    {
        Storage::fake('public');

        $this->actingAs($this->user)
            ->post('/products', [
                'name' => 'Café molido',
                'unit' => 'paq',
                'image' => UploadedFile::fake()->image('cafe.jpg', 100, 100),
            ])
            ->assertRedirect();

        $product = Product::ownedBy($this->user)->firstOrFail();
        $this->assertSame('Café molido', $product->name);
        $this->assertNotNull($product->image_path);
        Storage::disk('public')->assertExists($product->image_path);
    }

    public function test_alta_en_despensa_con_categoria_inline(): void
    {
        $this->actingAs($this->user)
            ->post('/pantry', [
                'product_name' => 'Lavandina',
                'quantity' => 1,
                'min_quantity' => 1,
                'category_name' => 'Limpieza',
            ])
            ->assertRedirect();

        $item = PantryItem::where('user_id', $this->user->id)->firstOrFail();
        $this->assertSame('Lavandina', $item->product->name);
        $this->assertSame('Limpieza', $item->category->name);
    }

    public function test_editar_producto_ajeno_da_403_en_la_web(): void
    {
        $other = User::factory()->create();
        $foreign = Product::findOrCreateFor($other, 'Cerveza');

        $this->actingAs($this->user)
            ->patch("/products/{$foreign->id}", ['name' => 'Hackeada'])
            ->assertForbidden();
    }
}
