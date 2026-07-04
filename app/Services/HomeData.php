<?php

namespace App\Services;

use App\Models\Category;
use App\Models\PantryItem;
use App\Models\User;

/**
 * Datos para la pantalla de inicio: despensa con semáforo (green/yellow/red),
 * tiendas con precios vigentes por producto, y categorías del usuario.
 * El filtrado (estado + tienda + categoría) se hace en el cliente.
 */
class HomeData
{
    public static function build(User $user): array
    {
        $today = now()->toDateString();

        $pantry = PantryItem::with(['product', 'category'])
            ->where('user_id', $user->id)
            ->get()
            ->sortBy(fn ($item) => $item->product->name)
            ->values();

        $stores = $user->stores()
            ->with('products')
            ->orderBy('name')
            ->get()
            ->map(fn ($store) => [
                'id' => $store->id,
                'name' => $store->name,
                'address' => $store->address,
                'prices' => $store->products->mapWithKeys(function ($product) use ($today) {
                    $onSale = $product->pivot->sale_price !== null
                        && ($product->pivot->sale_ends_at === null || $product->pivot->sale_ends_at >= $today);

                    return [$product->id => [
                        'price' => $onSale
                            ? (float) $product->pivot->sale_price
                            : ($product->pivot->price !== null ? (float) $product->pivot->price : null),
                        'on_sale' => $onSale,
                    ]];
                }),
            ])
            ->values();

        return [
            'pantry' => $pantry,
            'stores' => $stores,
            'categories' => Category::where('user_id', $user->id)->orderBy('name')->get(),
        ];
    }
}
