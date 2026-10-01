<?php

namespace Tests\Feature;

use App\Models\CanonicalProduct;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Recorrido completo de dos usuarios reales contra la API, de punta a punta:
 * registro con cuenta pre-armada → lista compartida → compra → despensa →
 * gastos → recomendaciones. Si algo de este flujo se rompe, este test lo ve.
 */
class EndToEndFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_flujo_completo_de_compra_compartida(): void
    {
        // ── María se registra: cuenta pre-armada ──────────────────────────
        $maria = $this->register('María', 'maria@test.com');

        $products = $this->api($maria)->getJson('/api/products')->assertOk()->json();
        $this->assertCount(36, $products);
        $this->assertCount(11, $this->api($maria)->getJson('/api/categories')->assertOk()->json());

        $productId = fn (string $name) => collect($products)->firstWhere('name', $name)['id'];

        // ── Arma su lista semanal ─────────────────────────────────────────
        $listId = $this->api($maria)
            ->postJson('/api/lists', ['name' => 'Semanal', 'recurrence_days' => 7])
            ->assertCreated()
            ->json('id');

        $this->api($maria)->postJson("/api/lists/{$listId}/items", ['product_id' => $productId('Leche'), 'quantity' => 2])->assertCreated();
        $this->api($maria)->postJson("/api/lists/{$listId}/items", ['product_id' => $productId('Pan'), 'quantity' => 1])->assertCreated();
        $this->api($maria)->postJson("/api/lists/{$listId}/items", ['product_name' => 'Milanesas de soja'])->assertCreated();

        // ── Juan se registra y María le comparte la lista ─────────────────
        $juan = $this->register('Juan', 'juan@test.com');

        $this->api($maria)
            ->postJson("/api/lists/{$listId}/share", ['email' => 'juan@test.com', 'role' => 'list-editor'])
            ->assertOk();

        $juanView = $this->api($juan)->getJson("/api/lists/{$listId}")->assertOk()->json();
        $this->assertSame('list-editor', $juanView['my_role']);
        $this->assertCount(3, $juanView['items']);

        // Juan agrega "LECHE" con su vocabulario: no duplica el ítem de María.
        $this->api($juan)->postJson("/api/lists/{$listId}/items", ['product_name' => 'LECHE', 'quantity' => 3])->assertCreated();
        $items = collect($this->api($juan)->getJson("/api/lists/{$listId}")->json('items'));
        $this->assertCount(3, $items);
        $this->assertSame(1, CanonicalProduct::where('name', 'leche')->count());

        // ── Juan hace la compra: los ítems van a SU despensa ──────────────
        foreach ($items as $item) {
            $this->api($juan)->patchJson("/api/items/{$item['id']}", ['status' => 'checked'])->assertOk();
        }

        $pantryJuan = collect($this->api($juan)->getJson('/api/pantry')->assertOk()->json());
        $this->assertCount(3, $pantryJuan);
        $this->assertEquals(3.0, $pantryJuan->firstWhere('product.name', 'Leche')['quantity']);

        $this->assertCount(0, $this->api($maria)->getJson('/api/pantry')->assertOk()->json());

        // ── Gastos: Juan pagó todo, María le debe la mitad ────────────────
        $settle = $this->api($juan)
            ->postJson("/api/lists/{$listId}/expenses", ['amount' => 10000, 'note' => 'Súper'])
            ->assertCreated()
            ->json();
        $this->assertSame('María', $settle['transfers'][0]['from']);
        $this->assertSame('Juan', $settle['transfers'][0]['to']);
        $this->assertEquals(5000, $settle['transfers'][0]['amount']);

        // ── Nuevo ciclo: reset deja todo pendiente sin tocar despensas ────
        $this->api($maria)->postJson("/api/lists/{$listId}/reset")->assertOk();
        $statuses = collect($this->api($maria)->getJson("/api/lists/{$listId}")->json('items'))
            ->pluck('status')
            ->unique();
        $this->assertSame(['pending'], $statuses->all());
        $this->assertEquals(
            3.0,
            collect($this->api($juan)->getJson('/api/pantry')->json())->firstWhere('product.name', 'Leche')['quantity'],
        );

        // ── María marca faltantes y pide recomendaciones ──────────────────
        $this->api($maria)
            ->postJson('/api/pantry', ['product_id' => $productId('Leche'), 'quantity' => 0, 'min_quantity' => 2])
            ->assertCreated();

        $storeId = $this->api($maria)
            ->postJson('/api/stores', ['name' => 'Coto', 'address' => 'Cabildo 500'])
            ->assertCreated()
            ->json('id');
        $this->api($maria)
            ->postJson("/api/stores/{$storeId}/products", ['product_id' => $productId('Leche'), 'price' => 1500])
            ->assertOk();

        $recommendations = $this->api($maria)->getJson('/api/recommendations')->assertOk()->json();
        $this->assertTrue(collect($recommendations['missing'])->pluck('name')->contains('Leche'));
        $this->assertSame('Coto', $recommendations['stores'][0]['name']);
        $this->assertGreaterThanOrEqual(1, $recommendations['stores'][0]['covered']);

        // ── Los "amigos" quedaron vinculados por la lista compartida ──────
        $friends = collect($this->api($maria)->getJson('/api/friends')->assertOk()->json());
        $this->assertTrue($friends->pluck('email')->contains('juan@test.com'));
    }

    /** Registra un usuario por la API y devuelve su token Bearer. */
    private function register(string $name, string $email): string
    {
        return $this->postJson('/api/register', [
            'name' => $name,
            'email' => $email,
            'password' => 'clave-segura-1',
            'device_name' => 'e2e',
        ])->assertCreated()->json('token');
    }

    /** Cliente API autenticado con el token Bearer del usuario. */
    private function api(string $token): static
    {
        // El guard cachea el usuario resuelto dentro del mismo test: hay que
        // olvidarlo para poder alternar entre los tokens de María y Juan.
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }
}
