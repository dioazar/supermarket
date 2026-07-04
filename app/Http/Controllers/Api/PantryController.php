<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\PantryItem;
use App\Models\Product;
use Illuminate\Http\Request;

class PantryController extends Controller
{
    public function index(Request $request)
    {
        $items = PantryItem::with(['product', 'category'])
            ->where('user_id', $request->user()->id)
            ->get()
            ->sortBy(fn ($item) => $item->product->name)
            ->values();

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['nullable', 'exists:products,id', 'required_without:product_name'],
            'product_name' => ['nullable', 'string', 'max:100', 'required_without:product_id'],
            'quantity' => ['required', 'numeric', 'min:0'],
            'min_quantity' => ['nullable', 'numeric', 'min:0'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'category_name' => ['nullable', 'string', 'max:50'],
        ]);

        $categoryId = null;
        if (! empty($data['category_id'])) {
            $category = Category::findOrFail($data['category_id']);
            abort_unless($category->user_id === $request->user()->id, 403);
            $categoryId = $category->id;
        } elseif (! empty($data['category_name'])) {
            $categoryId = Category::firstOrCreate([
                'user_id' => $request->user()->id,
                'name' => trim($data['category_name']),
            ])->id;
        }

        $product = isset($data['product_id'])
            ? Product::findOrFail($data['product_id'])
            : Product::firstOrCreate(['name' => trim($data['product_name'])]);

        $item = PantryItem::updateOrCreate(
            ['user_id' => $request->user()->id, 'product_id' => $product->id],
            [
                'quantity' => $data['quantity'],
                'min_quantity' => $data['min_quantity'] ?? 1,
                'category_id' => $categoryId,
            ]
        );

        return response()->json($item->load('product'), 201);
    }

    public function update(Request $request, PantryItem $pantry)
    {
        abort_unless($pantry->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'quantity' => ['nullable', 'numeric', 'min:0'],
            'min_quantity' => ['nullable', 'numeric', 'min:0'],
            'category_id' => ['nullable', 'exists:categories,id'],
        ]);

        if (array_key_exists('category_id', $data) && $data['category_id'] !== null) {
            $category = Category::findOrFail($data['category_id']);
            abort_unless($category->user_id === $request->user()->id, 403);
        }

        $updates = array_filter($data, fn ($v) => $v !== null);
        if ($request->has('category_id') && $request->input('category_id') === null) {
            $updates['category_id'] = null;
        }

        $pantry->update($updates);

        return response()->json($pantry->load('product'));
    }

    public function destroy(Request $request, PantryItem $pantry)
    {
        abort_unless($pantry->user_id === $request->user()->id, 403);

        $pantry->delete();

        return response()->json(['ok' => true]);
    }
}
