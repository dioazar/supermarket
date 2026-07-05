<?php

namespace App\Http\Controllers;

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
            ? Product::ownedBy($request->user())->findOrFail($data['product_id'])
            : Product::findOrCreateFor($request->user(), $data['product_name']);

        // En listas compartidas cada miembro usa su vocabulario: si otro ya
        // agregó un producto equivalente (mismo canónico), se pisa ese ítem
        // en vez de duplicar "Leche" y "leche".
        $existing = $list->items()
            ->whereRelation('product', 'canonical_product_id', $product->canonical_product_id)
            ->first();

        $list->items()->updateOrCreate(
            ['product_id' => $existing->product_id ?? $product->id],
            [
                'quantity' => $data['quantity'] ?? 1,
                'added_by' => $request->user()->id,
                'status' => 'pending',
                'checked_at' => null,
            ]
        );

        return back();
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

        return back();
    }

    public function destroy(Request $request, ListItem $item)
    {
        $this->authorize('update', $item->shoppingList);

        $item->delete();

        return back();
    }

    /**
     * Checking an item off means you bought it: it goes into your pantry.
     * Un-checking reverts that.
     */
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
