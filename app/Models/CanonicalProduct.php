<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Catálogo interno normalizado: "LECHE", "leche" y "Leche " de distintos
 * usuarios apuntan al mismo canónico. No se expone en la UI; existe para
 * poder hacer seguimiento y estadísticas entre cuentas sin normalizar después.
 */
class CanonicalProduct extends Model
{
    protected $fillable = ['name'];

    public static function normalize(string $name): string
    {
        return Str::lower(Str::ascii(Str::squish($name)));
    }

    public static function resolve(string $name): self
    {
        return static::firstOrCreate(['name' => static::normalize($name)]);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
