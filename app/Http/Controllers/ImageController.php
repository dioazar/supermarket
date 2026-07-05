<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Services\ImageStorage;
use Illuminate\Http\Request;

/**
 * Subida de imágenes para categorías y productos (web + api usan las mismas rutas
 * de negocio; acá respondemos según lo que espere el cliente).
 */
class ImageController extends Controller
{
    public function categoryImage(Request $request, Category $category)
    {
        abort_unless($category->user_id === $request->user()->id, 403);

        $request->validate(['image' => ['required', 'image', 'max:8192']]);

        ImageStorage::delete($category->image_path);
        $category->update([
            'image_path' => ImageStorage::store($request->file('image'), 'categories', 256),
        ]);

        return $request->wantsJson() ? response()->json($category) : back();
    }

    public function productImage(Request $request, Product $product)
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        $request->validate(['image' => ['required', 'image', 'max:8192']]);

        ImageStorage::delete($product->image_path);
        $product->update([
            'image_path' => ImageStorage::store($request->file('image'), 'products', 512),
        ]);

        return $request->wantsJson() ? response()->json($product) : back();
    }
}
