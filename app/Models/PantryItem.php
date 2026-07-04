<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PantryItem extends Model
{
    protected $fillable = ['user_id', 'product_id', 'category_id', 'quantity', 'min_quantity'];

    protected $casts = [
        'quantity' => 'float',
        'min_quantity' => 'float',
    ];

    protected $appends = ['status'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Semáforo de stock:
     *  - green: tengo suficiente (quantity >= min_quantity)
     *  - yellow: queda poco (0 < quantity < min_quantity)
     *  - red: no tengo (quantity <= 0)
     */
    protected function status(): Attribute
    {
        return Attribute::get(function () {
            if ($this->quantity <= 0) {
                return 'red';
            }

            return $this->quantity < $this->min_quantity ? 'yellow' : 'green';
        });
    }

    public function scopeLow(Builder $query): Builder
    {
        return $query->whereColumn('quantity', '<', 'min_quantity');
    }
}
