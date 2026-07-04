<?php

namespace App\Http\Controllers;

use App\Services\StoreRecommender;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RecommendationController extends Controller
{
    public function index(Request $request, StoreRecommender $recommender)
    {
        $data = $request->validate([
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        return Inertia::render('Recommendations/Index', $recommender->recommend(
            $request->user(),
            isset($data['lat']) ? (float) $data['lat'] : null,
            isset($data['lng']) ? (float) $data['lng'] : null,
        ));
    }
}
