<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\ShoppingList;
use Illuminate\Http\Request;

class ExpensePageController extends Controller
{
    public function store(Request $request, ShoppingList $list)
    {
        $this->authorize('view', $list);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:99999999'],
            'note' => ['nullable', 'string', 'max:150'],
        ]);

        $list->expenses()->create([
            'user_id' => $request->user()->id,
            'amount' => $data['amount'],
            'note' => $data['note'] ?? null,
        ]);

        return back();
    }

    public function destroy(Request $request, Expense $expense)
    {
        abort_unless(
            $expense->user_id === $request->user()->id
                || $expense->shoppingList->owner_id === $request->user()->id,
            403,
        );

        $expense->delete();

        return back();
    }
}
