<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        // image_path va en el select para que el accessor image_url funcione.
        return response()->json(
            Product::ownedBy($request->user())
                ->with('category:id,name')
                ->orderBy('name')
                ->get(['id', 'name', 'unit', 'image_path', 'category_id'])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'unit' => ['nullable', 'string', 'max:20'],
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

        return response()->json($product->load('category:id,name'), 201);
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

        return response()->json($product->load('category:id,name'));
    }
}
