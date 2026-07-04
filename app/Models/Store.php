<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Store extends Model
{
    protected $fillable = ['user_id', 'name', 'address', 'lat', 'lng', 'website'];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
    ];

    /** Distancia haversine en km hasta un punto, o null si falta alguna coordenada. */
    public function distanceTo(?float $lat, ?float $lng): ?float
    {
        if ($lat === null || $lng === null || $this->lat === null || $this->lng === null) {
            return null;
        }

        $earthRadiusKm = 6371;
        $dLat = deg2rad($this->lat - $lat);
        $dLng = deg2rad($this->lng - $lng);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat)) * cos(deg2rad($this->lat)) * sin($dLng / 2) ** 2;

        return round($earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a)), 2);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class)
            ->withPivot('price', 'sale_price', 'sale_ends_at')
            ->withTimestamps();
    }
}
