<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Product extends Model
{
    protected $fillable = [
        'user_id',
        'canonical_product_id',
        'name',
        'category',
        'category_id',
        'unit',
        'image_path',
    ];

    protected $appends = ['image_url'];

    protected static function booted(): void
    {
        // El canónico normalizado sigue siempre al nombre visible.
        static::saving(function (Product $product) {
            if ($product->name && ($product->isDirty('name') || ! $product->canonical_product_id)) {
                $product->canonical_product_id = CanonicalProduct::resolve($product->name)->id;
            }
        });
    }

    public function scopeOwnedBy(Builder $query, User|int $user): Builder
    {
        return $query->where('user_id', $user instanceof User ? $user->id : $user);
    }

    /**
     * Busca en el vocabulario del usuario un producto equivalente (mismo
     * canónico: "leche" encuentra su "Leche") o lo crea a su nombre.
     */
    public static function findOrCreateFor(
        User|int $user,
        string $name,
        array $attributes = [],
    ): self {
        $userId = $user instanceof User ? $user->id : $user;
        $canonical = CanonicalProduct::resolve($name);

        return static::ownedBy($userId)
            ->where('canonical_product_id', $canonical->id)
            ->first()
            ?? static::create([
                'user_id' => $userId,
                'name' => Str::squish($name),
                ...$attributes,
            ]);
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path
            ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->image_path)
            : null;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function canonical(): BelongsTo
    {
        return $this->belongsTo(CanonicalProduct::class, 'canonical_product_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function stores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class)
            ->withPivot('price', 'sale_price', 'sale_ends_at')
            ->withTimestamps();
    }
}
