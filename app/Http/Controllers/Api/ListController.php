<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShoppingList;
use App\Services\ExpenseSplitter;
use App\Services\ListSharing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ListController extends Controller
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

        return response()->json($lists);
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

        return response()->json($list, 201);
    }

    public function show(Request $request, ShoppingList $list)
    {
        $this->authorize('view', $list);

        $user = $request->user();

        return response()->json([
            'list' => $list->load('owner:id,name'),
            'items' => $list->items()->with('product')->orderBy('created_at')->get(),
            'members' => $list->members()->get(),
            'my_role' => ListSharing::roleOn($user, $list),
            'expenses' => ExpenseSplitter::settle($list),
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

        // Clientes pueden mandar el número como string y addDays() exige int.
        $recurrence = isset($data['recurrence_days']) ? (int) $data['recurrence_days'] : null;

        $list->update([
            'name' => $data['name'],
            'recurrence_days' => $recurrence,
            'next_recurrence_at' => $recurrence
                ? ($list->recurrence_days == $recurrence ? $list->next_recurrence_at : now()->addDays($recurrence))
                : null,
        ]);

        return response()->json($list);
    }

    public function destroy(Request $request, ShoppingList $list)
    {
        $this->authorize('delete', $list);

        DB::table('model_has_roles')
            ->where(config('permission.column_names.team_foreign_key'), $list->id)
            ->delete();

        $list->delete();

        return response()->json(['ok' => true]);
    }

    public function reset(Request $request, ShoppingList $list)
    {
        $this->authorize('update', $list);

        // Nuevo ciclo de compra: todo vuelve a pendiente sin tocar la alacena.
        $list->items()->update(['status' => 'pending', 'checked_at' => null]);

        return response()->json(['ok' => true]);
    }
}
