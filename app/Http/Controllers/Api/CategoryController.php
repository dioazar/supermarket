<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Category::where('user_id', $request->user()->id)->orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
        ]);

        $category = Category::firstOrCreate([
            'user_id' => $request->user()->id,
            'name' => trim($data['name']),
        ]);

        return response()->json($category, 201);
    }

    public function destroy(Request $request, Category $category)
    {
        abort_unless($category->user_id === $request->user()->id, 403);

        $category->delete();

        return response()->json(['ok' => true]);
    }
}
