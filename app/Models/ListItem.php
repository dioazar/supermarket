<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListItem extends Model
{
    protected $fillable = ['shopping_list_id', 'product_id', 'added_by', 'quantity', 'status', 'checked_at'];

    protected $casts = [
        'checked_at' => 'datetime',
        'quantity' => 'float',
    ];

    public function shoppingList(): BelongsTo
    {
        return $this->belongsTo(ShoppingList::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
