<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    protected $fillable = ['name', 'category', 'unit'];

    public function stores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class)
            ->withPivot('price', 'sale_price', 'sale_ends_at')
            ->withTimestamps();
    }
}
