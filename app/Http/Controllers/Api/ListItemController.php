<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ListItem;
use App\Models\PantryItem;
use App\Models\Product;
use App\Models\ShoppingList;
use Illuminate\Http\Request;

class ListItemController extends Controller
{
    public function store(Request $request, ShoppingList $list)
    {
        $this->authorize('update', $list);

        $data = $request->validate([
            'product_id' => ['nullable', 'exists:products,id', 'required_without:product_name'],
            'product_name' => ['nullable', 'string', 'max:100', 'required_without:product_id'],
            'quantity' => ['nullable', 'numeric', 'min:0.01'],
        ]);

        $product = isset($data['product_id'])
            ? Product::findOrFail($data['product_id'])
            : Product::firstOrCreate(['name' => trim($data['product_name'])]);

        $item = $list->items()->updateOrCreate(
            ['product_id' => $product->id],
            [
                'quantity' => $data['quantity'] ?? 1,
                'added_by' => $request->user()->id,
                'status' => 'pending',
                'checked_at' => null,
            ]
        );

        return response()->json($item->load('product'), 201);
    }

    public function update(Request $request, ListItem $item)
    {
        $this->authorize('update', $item->shoppingList);

        $data = $request->validate([
            'status' => ['nullable', 'in:pending,checked,missing'],
            'quantity' => ['nullable', 'numeric', 'min:0.01'],
        ]);

        $oldStatus = $item->status;

        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            $item->status = $data['status'];
            $item->checked_at = $data['status'] === 'checked' ? now() : null;
            $this->syncPantry($request, $item, $oldStatus, $data['status']);
        }

        if (isset($data['quantity'])) {
            $item->quantity = $data['quantity'];
        }

        $item->save();

        return response()->json($item->load('product'));
    }

    public function destroy(Request $request, ListItem $item)
    {
        $this->authorize('update', $item->shoppingList);

        $item->delete();

        return response()->json(['ok' => true]);
    }

    private function syncPantry(Request $request, ListItem $item, string $from, string $to): void
    {
        $pantry = PantryItem::firstOrCreate(
            ['user_id' => $request->user()->id, 'product_id' => $item->product_id],
            ['quantity' => 0, 'min_quantity' => 1]
        );

        if ($to === 'checked' && $from !== 'checked') {
            $pantry->update(['quantity' => $pantry->quantity + $item->quantity]);
        } elseif ($from === 'checked' && $to !== 'checked') {
            $pantry->update(['quantity' => max(0, $pantry->quantity - $item->quantity)]);
        }
    }
}
