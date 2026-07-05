<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Category::withCount('pantryItems')
                ->where('user_id', $request->user()->id)
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            // Solo dos niveles: el padre tiene que ser una categoría raíz propia.
            'parent_id' => [
                'nullable',
                Rule::exists('categories', 'id')
                    ->where('user_id', $request->user()->id)
                    ->whereNull('parent_id'),
            ],
        ]);

        $category = Category::firstOrCreate(
            [
                'user_id' => $request->user()->id,
                'name' => trim($data['name']),
            ],
            ['parent_id' => $data['parent_id'] ?? null],
        );

        return response()->json($category, 201);
    }

    public function update(Request $request, Category $category)
    {
        abort_unless($category->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'parent_id' => [
                'nullable',
                Rule::notIn([$category->id]),
                Rule::exists('categories', 'id')
                    ->where('user_id', $request->user()->id)
                    ->whereNull('parent_id'),
            ],
        ]);

        // Una categoría con hijas no puede volverse subcategoría (máx. 2 niveles).
        if (! empty($data['parent_id']) && $category->children()->exists()) {
            abort(422, 'Esta categoría tiene subcategorías: no puede ser subcategoría de otra.');
        }

        $category->update([
            'name' => trim($data['name']),
            'parent_id' => $request->has('parent_id')
                ? ($data['parent_id'] ?? null)
                : $category->parent_id,
        ]);

        return response()->json($category);
    }

    public function destroy(Request $request, Category $category)
    {
        abort_unless($category->user_id === $request->user()->id, 403);

        $category->delete();

        return response()->json(['ok' => true]);
    }
}
