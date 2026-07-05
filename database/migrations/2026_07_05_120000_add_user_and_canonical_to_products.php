<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Los productos pasan de ser globales a ser de cada usuario. Para poder seguir
 * unificando "LECHE" y "leche" de usuarios distintos (estadísticas futuras),
 * cada producto apunta a un canonical_product con el nombre normalizado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('canonical_products', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique('products_name_unique');
            $table->foreignId('user_id')->nullable()->after('id')
                ->constrained()->cascadeOnDelete();
            $table->foreignId('canonical_product_id')->nullable()->after('user_id')
                ->constrained()->nullOnDelete();
            $table->unique(['user_id', 'name']);
        });

        $this->assignOwnersAndCanonicals();
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'name']);
            $table->dropConstrainedForeignId('user_id');
            $table->dropConstrainedForeignId('canonical_product_id');
        });

        Schema::dropIfExists('canonical_products');
    }

    /**
     * Cada producto existente queda en manos del primer usuario que lo usa
     * (despensa, listas propias o precios de sus tiendas). Los demás usuarios
     * reciben una copia propia y sus referencias se remapean a esa copia.
     */
    private function assignOwnersAndCanonicals(): void
    {
        $fallbackUserId = DB::table('users')->orderBy('id')->value('id');

        foreach (DB::table('products')->orderBy('id')->get() as $product) {
            $canonicalId = $this->canonicalId($product->name);

            $userIds = collect()
                ->merge(
                    DB::table('pantry_items')
                        ->where('product_id', $product->id)
                        ->pluck('user_id'),
                )
                ->merge(
                    DB::table('list_items')
                        ->join('shopping_lists', 'shopping_lists.id', '=', 'list_items.shopping_list_id')
                        ->where('list_items.product_id', $product->id)
                        ->pluck('shopping_lists.owner_id'),
                )
                ->merge(
                    DB::table('product_store')
                        ->join('stores', 'stores.id', '=', 'product_store.store_id')
                        ->where('product_store.product_id', $product->id)
                        ->pluck('stores.user_id'),
                )
                ->unique()
                ->values();

            if ($userIds->isEmpty() && $fallbackUserId !== null) {
                $userIds = collect([$fallbackUserId]);
            }

            $ownerId = $userIds->shift();

            DB::table('products')->where('id', $product->id)->update([
                'user_id' => $ownerId,
                'canonical_product_id' => $canonicalId,
                'category_id' => $this->matchCategory($product->category_id, $ownerId),
            ]);

            foreach ($userIds as $userId) {
                $cloneId = DB::table('products')->insertGetId([
                    'user_id' => $userId,
                    'canonical_product_id' => $canonicalId,
                    'name' => $product->name,
                    'unit' => $product->unit,
                    'image_path' => $product->image_path,
                    'category_id' => $this->matchCategory($product->category_id, $userId),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('pantry_items')
                    ->where('product_id', $product->id)
                    ->where('user_id', $userId)
                    ->update(['product_id' => $cloneId]);

                DB::table('list_items')
                    ->where('product_id', $product->id)
                    ->whereIn(
                        'shopping_list_id',
                        DB::table('shopping_lists')->where('owner_id', $userId)->pluck('id'),
                    )
                    ->update(['product_id' => $cloneId]);

                DB::table('product_store')
                    ->where('product_id', $product->id)
                    ->whereIn(
                        'store_id',
                        DB::table('stores')->where('user_id', $userId)->pluck('id'),
                    )
                    ->update(['product_id' => $cloneId]);
            }
        }
    }

    private function canonicalId(string $name): int
    {
        $normalized = Str::lower(Str::ascii(Str::squish($name)));

        return DB::table('canonical_products')->where('name', $normalized)->value('id')
            ?? DB::table('canonical_products')->insertGetId([
                'name' => $normalized,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
    }

    /** La categoría original puede ser de otro usuario: se busca una propia con el mismo nombre. */
    private function matchCategory(?int $categoryId, ?int $userId): ?int
    {
        if ($categoryId === null || $userId === null) {
            return null;
        }

        $category = DB::table('categories')->find($categoryId);
        if (! $category) {
            return null;
        }

        if ($category->user_id === $userId) {
            return $category->id;
        }

        return DB::table('categories')
            ->where('user_id', $userId)
            ->where('name', $category->name)
            ->value('id');
    }
};
