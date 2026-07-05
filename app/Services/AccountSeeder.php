<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Deja la cuenta nueva pre-armada con categorías y productos básicos para que
 * no esté vacía al entrar. El usuario puede borrar o renombrar todo; los
 * productos quedan vinculados a sus canónicos como cualquier otro.
 */
class AccountSeeder
{
    /** Categoría raíz => subcategoría (null = directo en la raíz) => productos [nombre => unidad]. */
    private const STARTER = [
        'Almacén' => [
            null => [
                'Arroz' => 'kg',
                'Fideos' => 'paq',
                'Aceite' => 'lt',
                'Azúcar' => 'kg',
                'Sal' => 'un',
                'Harina' => 'kg',
            ],
            'Desayuno y merienda' => [
                'Yerba mate' => 'kg',
                'Café' => 'un',
                'Galletitas' => 'paq',
                'Mermelada' => 'un',
            ],
        ],
        'Lácteos y huevos' => [
            null => [
                'Leche' => 'lt',
                'Yogur' => 'un',
                'Queso cremoso' => 'kg',
                'Manteca' => 'un',
                'Huevos' => 'doc',
            ],
        ],
        'Carnicería' => [
            null => [
                'Carne picada' => 'kg',
                'Pollo' => 'kg',
                'Milanesas' => 'kg',
            ],
        ],
        'Frutas y verduras' => [
            null => [
                'Manzanas' => 'kg',
                'Bananas' => 'kg',
                'Papas' => 'kg',
                'Cebollas' => 'kg',
                'Tomates' => 'kg',
            ],
        ],
        'Panadería' => [
            null => [
                'Pan' => 'kg',
                'Pan lactal' => 'un',
            ],
        ],
        'Bebidas' => [
            'Gaseosas y aguas' => [
                'Agua mineral' => 'lt',
                'Gaseosa' => 'lt',
            ],
            'Vinos y cervezas' => [
                'Cerveza' => 'lt',
                'Vino' => 'un',
            ],
        ],
        'Limpieza' => [
            null => [
                'Detergente' => 'un',
                'Lavandina' => 'lt',
                'Papel higiénico' => 'paq',
                'Rollo de cocina' => 'un',
            ],
        ],
        'Perfumería' => [
            null => [
                'Shampoo' => 'un',
                'Jabón' => 'un',
                'Pasta de dientes' => 'un',
            ],
        ],
    ];

    public static function seed(User $user): void
    {
        // Idempotente: una cuenta que ya tiene datos propios no se toca.
        if (
            Category::where('user_id', $user->id)->exists()
            || Product::ownedBy($user)->exists()
        ) {
            return;
        }

        DB::transaction(function () use ($user) {
            foreach (self::STARTER as $rootName => $subcategories) {
                $root = Category::create([
                    'user_id' => $user->id,
                    'name' => $rootName,
                ]);

                foreach ($subcategories as $subName => $products) {
                    $categoryId = $root->id;
                    if ($subName !== null && $subName !== '') {
                        $categoryId = Category::create([
                            'user_id' => $user->id,
                            'name' => $subName,
                            'parent_id' => $root->id,
                        ])->id;
                    }

                    foreach ($products as $productName => $unit) {
                        Product::create([
                            'user_id' => $user->id,
                            'name' => $productName,
                            'unit' => $unit,
                            'category_id' => $categoryId,
                        ]);
                    }
                }
            }
        });
    }
}
