<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Services\ImageStorage;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CategoryPageController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Categories/Index', [
            'categories' => Category::withCount('pantryItems')
                ->where('user_id', $request->user()->id)
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'image' => ['nullable', 'image', 'max:8192'],
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

        if ($request->hasFile('image')) {
            ImageStorage::delete($category->image_path);
            $category->update([
                'image_path' => ImageStorage::store($request->file('image'), 'categories', 256),
            ]);
        }

        return back();
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
            return back()->withErrors(['parent_id' => 'Esta categoría tiene subcategorías: no puede ser subcategoría de otra.']);
        }

        $category->update([
            'name' => trim($data['name']),
            'parent_id' => $request->has('parent_id')
                ? ($data['parent_id'] ?? null)
                : $category->parent_id,
        ]);

        return back();
    }

    public function destroy(Request $request, Category $category)
    {
        abort_unless($category->user_id === $request->user()->id, 403);

        ImageStorage::delete($category->image_path);
        $category->delete();

        return back();
    }
}
