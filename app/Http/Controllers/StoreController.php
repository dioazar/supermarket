<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StoreController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Stores/Index', [
            'stores' => $request->user()->stores()->with('products')->orderBy('name')->get(),
            'products' => Product::orderBy('name')->get(['id', 'name', 'unit']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:200'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'website' => ['nullable', 'url', 'max:255'],
        ]);

        $request->user()->stores()->create($data);

        return back();
    }

    public function update(Request $request, Store $store)
    {
        abort_unless($store->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:200'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'website' => ['nullable', 'url', 'max:255'],
        ]);

        $store->update($data);

        return back();
    }

    public function destroy(Request $request, Store $store)
    {
        abort_unless($store->user_id === $request->user()->id, 403);

        $store->delete();

        return back();
    }

    public function attachProduct(Request $request, Store $store)
    {
        abort_unless($store->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'product_id' => ['nullable', 'exists:products,id', 'required_without:product_name'],
            'product_name' => ['nullable', 'string', 'max:100', 'required_without:product_id'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'sale_ends_at' => ['nullable', 'date'],
        ]);

        $product = isset($data['product_id'])
            ? Product::findOrFail($data['product_id'])
            : Product::firstOrCreate(['name' => trim($data['product_name'])]);

        $store->products()->syncWithoutDetaching([
            $product->id => [
                'price' => $data['price'] ?? null,
                'sale_price' => $data['sale_price'] ?? null,
                'sale_ends_at' => $data['sale_ends_at'] ?? null,
            ],
        ]);

        return back();
    }

    public function detachProduct(Request $request, Store $store, Product $product)
    {
        abort_unless($store->user_id === $request->user()->id, 403);

        $store->products()->detach($product->id);

        return back();
    }
}
