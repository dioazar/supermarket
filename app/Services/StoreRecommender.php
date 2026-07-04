<?php

namespace App\Services;

use App\Models\PantryItem;
use App\Models\Product;
use App\Models\ShoppingList;
use App\Models\User;
use Illuminate\Support\Collection;

class StoreRecommender
{
    /**
     * Products the user is missing: pantry items below their minimum,
     * plus unresolved items on any list the user can access.
     */
    public function missingProducts(User $user): Collection
    {
        $missing = collect();

        PantryItem::with('product')
            ->where('user_id', $user->id)
            ->low()
            ->get()
            ->each(function (PantryItem $item) use ($missing) {
                $missing->put($item->product_id, [
                    'product' => $item->product,
                    'needed' => max($item->min_quantity - $item->quantity, 1),
                    'sources' => ['despensa'],
                ]);
            });

        ShoppingList::accessibleBy($user)
            ->with(['items' => fn ($q) => $q->whereIn('status', ['pending', 'missing'])->with('product')])
            ->get()
            ->flatMap->items
            ->each(function ($item) use ($missing) {
                $entry = $missing->get($item->product_id, [
                    'product' => $item->product,
                    'needed' => $item->quantity,
                    'sources' => [],
                ]);
                $entry['sources'] = array_values(array_unique([...$entry['sources'], 'listas']));
                $missing->put($item->product_id, $entry);
            });

        return $missing;
    }

    /** Precio vigente del pivot: la oferta si está activa, si no el precio de lista. */
    private function effectivePrice(Product $product): array
    {
        $pivot = $product->pivot;
        $onSale = $pivot->sale_price !== null
            && ($pivot->sale_ends_at === null || $pivot->sale_ends_at >= now()->toDateString());

        return [
            'price' => $onSale ? (float) $pivot->sale_price : ($pivot->price !== null ? (float) $pivot->price : null),
            'list_price' => $pivot->price !== null ? (float) $pivot->price : null,
            'on_sale' => $onSale,
            'sale_ends_at' => $onSale ? $pivot->sale_ends_at : null,
        ];
    }

    /**
     * Rank the user's stores by coverage of missing products, then by
     * estimated total (using sale prices when active), then by distance.
     */
    public function recommend(User $user, ?float $lat = null, ?float $lng = null): array
    {
        $missing = $this->missingProducts($user);
        $productIds = $missing->keys()->all();

        $stores = $user->stores()
            ->with(['products' => fn ($q) => $q->whereIn('products.id', $productIds)])
            ->get();

        $ranked = $stores->map(function ($store) use ($missing, $lat, $lng) {
            $coveredIds = $store->products->pluck('id')->all();

            $coveredProducts = $store->products->map(function ($product) use ($missing) {
                $pricing = $this->effectivePrice($product);

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'needed' => round($missing[$product->id]['needed'] ?? 1, 2),
                    ...$pricing,
                ];
            })->values();

            $total = $coveredProducts->sum(
                fn ($p) => ($p['price'] ?? 0) * ($p['needed'] ?? 1)
            );

            return [
                'id' => $store->id,
                'name' => $store->name,
                'address' => $store->address,
                'website' => $store->website,
                'distance_km' => $store->distanceTo($lat, $lng),
                'covered' => count($coveredIds),
                'total' => round($total, 2),
                'offers_count' => $coveredProducts->where('on_sale', true)->count(),
                'covered_products' => $coveredProducts,
                'missing_products' => $missing->except($coveredIds)->map(fn ($m) => $m['product']->name)->values(),
            ];
        })->sortBy([
            ['covered', 'desc'],
            ['total', 'asc'],
            ['distance_km', 'asc'],
        ])->values()->all();

        return [
            'missing' => $missing->map(fn ($m) => [
                'id' => $m['product']->id,
                'name' => $m['product']->name,
                'unit' => $m['product']->unit,
                'needed' => round($m['needed'], 2),
                'sources' => $m['sources'],
            ])->values()->all(),
            'stores' => $ranked,
            'offers' => $this->offers($user),
        ];
    }

    /** Ofertas activas en las tiendas del usuario. */
    public function offers(User $user): array
    {
        $today = now()->toDateString();

        return $user->stores()
            ->with(['products' => fn ($q) => $q
                ->whereNotNull('product_store.sale_price')
                ->where(fn ($w) => $w->whereNull('product_store.sale_ends_at')
                    ->orWhere('product_store.sale_ends_at', '>=', $today)),
            ])
            ->get()
            ->flatMap(fn ($store) => $store->products->map(fn ($product) => [
                'store_id' => $store->id,
                'store' => $store->name,
                'product_id' => $product->id,
                'product' => $product->name,
                'unit' => $product->unit,
                'price' => $product->pivot->price !== null ? (float) $product->pivot->price : null,
                'sale_price' => (float) $product->pivot->sale_price,
                'sale_ends_at' => $product->pivot->sale_ends_at,
                'discount_pct' => $product->pivot->price
                    ? round((1 - $product->pivot->sale_price / $product->pivot->price) * 100)
                    : null,
            ]))
            ->sortByDesc('discount_pct')
            ->values()
            ->all();
    }
}
