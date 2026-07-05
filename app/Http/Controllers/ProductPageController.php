<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Services\ImageStorage;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProductPageController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Products/Index', [
            'products' => Product::ownedBy($request->user())
                ->with('category:id,name')
                ->orderBy('name')
                ->get(),
            'categories' => Category::where('user_id', $request->user()->id)
                ->orderBy('name')
                ->get(['id', 'name', 'parent_id']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'unit' => ['nullable', 'string', 'max:20'],
            'image' => ['nullable', 'image', 'max:8192'],
            'category_id' => [
                'nullable',
                Rule::exists('categories', 'id')->where('user_id', $request->user()->id),
            ],
        ]);

        $product = Product::findOrCreateFor(
            $request->user(),
            $data['name'],
            [
                'unit' => $data['unit'] ?? 'un',
                'category_id' => $data['category_id'] ?? null,
            ],
        );

        if ($request->hasFile('image')) {
            ImageStorage::delete($product->image_path);
            $product->update([
                'image_path' => ImageStorage::store($request->file('image'), 'products', 512),
            ]);
        }

        return back();
    }

    public function update(Request $request, Product $product)
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'unit' => ['nullable', 'string', 'max:20'],
            'category_id' => [
                'nullable',
                Rule::exists('categories', 'id')->where('user_id', $request->user()->id),
            ],
        ]);

        $product->update([
            'name' => trim($data['name']),
            'unit' => $data['unit'] ?? $product->unit,
            'category_id' => $request->has('category_id')
                ? ($data['category_id'] ?? null)
                : $product->category_id,
        ]);

        return back();
    }
}
