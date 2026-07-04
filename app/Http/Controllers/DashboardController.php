<?php

namespace App\Http\Controllers;

use App\Models\ShoppingList;
use App\Services\HomeData;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Inertia::render('Dashboard', [
            ...HomeData::build($user),
            'lists' => ShoppingList::accessibleBy($user)
                ->withCount(['items', 'items as checked_count' => fn ($q) => $q->where('status', 'checked')])
                ->orderBy('name')
                ->get(),
        ]);
    }
}
