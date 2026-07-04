<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Busca supermercados cercanos a una coordenada.
 *
 * Proveedor primario: Google Places (si hay GOOGLE_MAPS_API_KEY en .env).
 * Fallback sin key: Overpass API de OpenStreetMap (gratis, sin registro).
 */
class NearbyStores
{
    public function search(float $lat, float $lng, int $radiusMeters = 1500): array
    {
        // Cachea por celda de ~100 m para no quemar cuota con cada request.
        $cacheKey = sprintf('nearby:%.3f:%.3f:%d', $lat, $lng, $radiusMeters);

        return Cache::remember($cacheKey, now()->addMinutes(15), function () use ($lat, $lng, $radiusMeters) {
            $useGoogle = config('services.nearby_stores.provider') === 'google'
                && config('services.google.maps_key');

            $results = $useGoogle
                ? $this->fromGooglePlaces($lat, $lng, $radiusMeters)
                : $this->fromOverpass($lat, $lng, $radiusMeters);

            return collect($results)
                ->map(function ($place) use ($lat, $lng) {
                    $place['distance_km'] = $this->haversine($lat, $lng, $place['lat'], $place['lng']);

                    return $place;
                })
                ->sortBy('distance_km')
                ->values()
                ->all();
        });
    }

    private function fromGooglePlaces(float $lat, float $lng, int $radiusMeters): array
    {
        $response = Http::timeout(10)->get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', [
            'location' => "$lat,$lng",
            'radius' => $radiusMeters,
            'type' => 'supermarket',
            'language' => 'es',
            'key' => config('services.google.maps_key'),
        ]);

        if (! $response->ok() || $response->json('status') !== 'OK') {
            return [];
        }

        return collect($response->json('results', []))
            ->map(fn ($place) => [
                'source' => 'google',
                'external_id' => $place['place_id'],
                'name' => $place['name'],
                'address' => $place['vicinity'] ?? null,
                'lat' => $place['geometry']['location']['lat'],
                'lng' => $place['geometry']['location']['lng'],
                'open_now' => $place['opening_hours']['open_now'] ?? null,
                'rating' => $place['rating'] ?? null,
            ])
            ->all();
    }

    private function fromOverpass(float $lat, float $lng, int $radiusMeters): array
    {
        $query = sprintf(
            '[out:json][timeout:10];('
            .'node["shop"~"supermarket|convenience|greengrocer"](around:%1$d,%2$F,%3$F);'
            .'way["shop"~"supermarket|convenience|greengrocer"](around:%1$d,%2$F,%3$F);'
            .');out center 30;',
            $radiusMeters,
            $lat,
            $lng,
        );

        $response = Http::timeout(15)
            ->withHeaders(['User-Agent' => 'SuperLista/1.0 (app de listas de supermercado)'])
            ->asForm()
            ->post('https://overpass-api.de/api/interpreter', ['data' => $query]);

        if (! $response->ok()) {
            return [];
        }

        return collect($response->json('elements', []))
            ->map(function ($element) {
                $tags = $element['tags'] ?? [];
                $name = $tags['name'] ?? $tags['brand'] ?? null;

                if (! $name) {
                    return null;
                }

                $street = $tags['addr:street'] ?? null;
                $number = $tags['addr:housenumber'] ?? null;

                return [
                    'source' => 'osm',
                    'external_id' => (string) $element['id'],
                    'name' => $name,
                    'address' => $street ? trim("$street $number") : null,
                    'lat' => $element['lat'] ?? $element['center']['lat'] ?? null,
                    'lng' => $element['lon'] ?? $element['center']['lon'] ?? null,
                    'open_now' => null,
                    'rating' => null,
                ];
            })
            ->filter(fn ($place) => $place && $place['lat'] !== null)
            ->unique(fn ($place) => $place['name'].'|'.round($place['lat'], 4).'|'.round($place['lng'], 4))
            ->all();
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return round($earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a)), 2);
    }
}
