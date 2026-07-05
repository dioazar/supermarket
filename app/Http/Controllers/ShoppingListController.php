<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ShoppingList;
use App\Services\ExpenseSplitter;
use App\Services\ListSharing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ShoppingListController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $lists = ShoppingList::accessibleBy($user)
            ->with('owner:id,name')
            ->withCount(['items', 'items as checked_count' => fn ($q) => $q->where('status', 'checked')])
            ->orderBy('name')
            ->get()
            ->map(function (ShoppingList $list) use ($user) {
                $list->my_role = ListSharing::roleOn($user, $list);

                return $list;
            });

        return Inertia::render('Lists/Index', ['lists' => $lists]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'recurrence_days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        $list = ShoppingList::create([
            'owner_id' => $request->user()->id,
            'name' => $data['name'],
            'recurrence_days' => $data['recurrence_days'] ?? null,
            'next_recurrence_at' => isset($data['recurrence_days'])
                ? now()->addDays((int) $data['recurrence_days'])
                : null,
        ]);

        ListSharing::setRole($request->user(), $list, 'list-owner');

        return redirect()->route('lists.show', $list);
    }

    public function show(Request $request, ShoppingList $list)
    {
        $this->authorize('view', $list);

        $user = $request->user();

        return Inertia::render('Lists/Show', [
            'list' => $list->load('owner:id,name')->loadCount('items'),
            'items' => $list->items()->with('product')->orderBy('created_at')->get(),
            'members' => $list->members()->get(),
            'products' => Product::ownedBy($user)
                ->orderBy('name')
                ->get(['id', 'name', 'unit']),
            'onlineStores' => $user->stores()->whereNotNull('website')->get(['id', 'name', 'website']),
            'myRole' => ListSharing::roleOn($user, $list),
            'expenses' => ExpenseSplitter::settle($list),
            'friends' => ListSharing::friendsOf($user),
            'can' => [
                'edit' => $user->can('update', $list),
                'share' => $user->can('share', $list),
                'delete' => $user->can('delete', $list),
            ],
        ]);
    }

    public function update(Request $request, ShoppingList $list)
    {
        $this->authorize('update', $list);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'recurrence_days' => ['nullable', 'integer', 'min:1', 'max:365'],
        ]);

        // El form web manda el número como string y addDays() exige int.
        $recurrence = isset($data['recurrence_days']) ? (int) $data['recurrence_days'] : null;

        $list->update([
            'name' => $data['name'],
            'recurrence_days' => $recurrence,
            'next_recurrence_at' => $recurrence
                ? ($list->recurrence_days == $recurrence ? $list->next_recurrence_at : now()->addDays($recurrence))
                : null,
        ]);

        return back();
    }

    public function destroy(Request $request, ShoppingList $list)
    {
        $this->authorize('delete', $list);

        // Clean up team-scoped role assignments for this list.
        DB::table('model_has_roles')
            ->where(config('permission.column_names.team_foreign_key'), $list->id)
            ->delete();

        $list->delete();

        return redirect()->route('lists.index');
    }

    public function reset(Request $request, ShoppingList $list)
    {
        $this->authorize('update', $list);

        // Nuevo ciclo de compra: todo vuelve a pendiente sin tocar la alacena.
        $list->items()->update(['status' => 'pending', 'checked_at' => null]);

        return back();
    }
}
