<?php

namespace Tests\Feature\Api;

use App\Models\CanonicalProduct;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ProductApiTest extends ApiTestCase
{
    public function test_index_solo_devuelve_los_productos_del_usuario(): void
    {
        $user = $this->user();
        $other = $this->user();
        $this->productFor($user, 'Leche');
        $this->productFor($other, 'Cerveza');

        $this->actingAsApi($user)
            ->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Leche');
    }

    public function test_store_crea_producto_propio_con_canonico(): void
    {
        $user = $this->user();
        $category = Category::create(['user_id' => $user->id, 'name' => 'Lácteos']);

        $this->actingAsApi($user)
            ->postJson('/api/products', [
                'name' => 'Queso Cremoso',
                'unit' => 'kg',
                'category_id' => $category->id,
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Queso Cremoso');

        $product = Product::ownedBy($user)->firstOrFail();
        $this->assertSame('queso cremoso', $product->canonical->name);
    }

    public function test_store_con_nombre_equivalente_no_duplica(): void
    {
        $user = $this->user();
        $existing = $this->productFor($user, 'Leche');

        $this->actingAsApi($user)
            ->postJson('/api/products', ['name' => '  LECHE '])
            ->assertCreated()
            ->assertJsonPath('id', $existing->id)
            ->assertJsonPath('name', 'Leche');

        $this->assertSame(1, Product::ownedBy($user)->count());
    }

    public function test_usuarios_distintos_comparten_canonico_pero_no_producto(): void
    {
        $user = $this->user();
        $other = $this->user();

        $mine = $this->productFor($user, 'LECHE');
        $theirs = $this->productFor($other, 'leche');

        $this->assertNotSame($mine->id, $theirs->id);
        $this->assertSame($mine->canonical_product_id, $theirs->canonical_product_id);
        $this->assertSame(1, CanonicalProduct::where('name', 'leche')->count());
    }

    public function test_update_renombra_y_reresuelve_el_canonico(): void
    {
        $user = $this->user();
        $product = $this->productFor($user, 'Leche');

        $this->actingAsApi($user)
            ->patchJson("/api/products/{$product->id}", ['name' => 'Leche descremada', 'unit' => 'lt'])
            ->assertOk()
            ->assertJsonPath('name', 'Leche descremada');

        $this->assertSame('leche descremada', $product->fresh()->canonical->name);
    }

    public function test_update_rechaza_producto_ajeno(): void
    {
        $user = $this->user();
        $other = $this->user();
        $product = $this->productFor($other, 'Cerveza');

        $this->actingAsApi($user)
            ->patchJson("/api/products/{$product->id}", ['name' => 'Hackeada'])
            ->assertForbidden();
    }

    public function test_update_rechaza_categoria_ajena(): void
    {
        $user = $this->user();
        $other = $this->user();
        $product = $this->productFor($user, 'Leche');
        $foreignCategory = Category::create(['user_id' => $other->id, 'name' => 'Ajena']);

        $this->actingAsApi($user)
            ->patchJson("/api/products/{$product->id}", [
                'name' => 'Leche',
                'category_id' => $foreignCategory->id,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('category_id');
    }

    public function test_subir_imagen_de_producto_propio(): void
    {
        Storage::fake('public');
        $user = $this->user();
        $product = $this->productFor($user, 'Leche');

        $this->actingAsApi($user)
            ->postJson("/api/products/{$product->id}/image", [
                'image' => UploadedFile::fake()->image('leche.jpg', 100, 100),
            ])
            ->assertOk();

        $this->assertNotNull($product->fresh()->image_path);
        Storage::disk('public')->assertExists($product->fresh()->image_path);
    }

    public function test_subir_imagen_a_producto_ajeno_da_403(): void
    {
        Storage::fake('public');
        $user = $this->user();
        $other = $this->user();
        $product = $this->productFor($other, 'Cerveza');

        $this->actingAsApi($user)
            ->postJson("/api/products/{$product->id}/image", [
                'image' => UploadedFile::fake()->image('x.jpg'),
            ])
            ->assertForbidden();
    }
}
