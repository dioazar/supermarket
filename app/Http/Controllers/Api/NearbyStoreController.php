<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NearbyStores;
use Illuminate\Http\Request;

class NearbyStoreController extends Controller
{
    public function index(Request $request, NearbyStores $nearby)
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'radius' => ['nullable', 'integer', 'min:100', 'max:5000'],
        ]);

        return response()->json([
            'provider' => config('services.nearby_stores.provider') === 'google'
                && config('services.google.maps_key') ? 'google' : 'osm',
            'places' => $nearby->search(
                (float) $data['lat'],
                (float) $data['lng'],
                (int) ($data['radius'] ?? 1500),
            ),
        ]);
    }
}
