<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\ShoppingList;
use App\Services\ExpenseSplitter;
use Illuminate\Http\Request;

class ExpenseController extends Controller
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

        return response()->json(ExpenseSplitter::settle($list), 201);
    }

    public function destroy(Request $request, Expense $expense)
    {
        $list = $expense->shoppingList;

        abort_unless(
            $expense->user_id === $request->user()->id || $list->owner_id === $request->user()->id,
            403,
        );

        $expense->delete();

        return response()->json(ExpenseSplitter::settle($list));
    }
}
