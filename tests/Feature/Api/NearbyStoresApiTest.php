<?php

namespace Tests\Feature\Api;

use Illuminate\Support\Facades\Http;

class NearbyStoresApiTest extends ApiTestCase
{
    public function test_devuelve_lugares_de_overpass_ordenados_por_distancia(): void
    {
        config(['services.nearby_stores.provider' => 'osm']);

        Http::fake([
            'overpass-api.de/*' => Http::response([
                'elements' => [
                    [
                        'type' => 'node',
                        'id' => 111,
                        'lat' => -34.570,
                        'lon' => -58.450,
                        'tags' => ['name' => 'Súper Lejos', 'shop' => 'supermarket'],
                    ],
                    [
                        'type' => 'node',
                        'id' => 222,
                        'lat' => -34.5601,
                        'lon' => -58.4601,
                        'tags' => ['name' => 'Chino Cerca', 'shop' => 'convenience', 'addr:street' => 'Monroe', 'addr:housenumber' => '2800'],
                    ],
                    [
                        'type' => 'node',
                        'id' => 333,
                        'lat' => -34.561,
                        'lon' => -58.461,
                        'tags' => ['shop' => 'supermarket'], // sin nombre: se descarta
                    ],
                ],
            ]),
        ]);

        $response = $this->actingAsApi($this->user())
            ->getJson('/api/stores/nearby?lat=-34.56&lng=-58.46')
            ->assertOk()
            ->assertJsonPath('provider', 'osm')
            ->assertJsonCount(2, 'places');

        // Ordenados por cercanía y con dirección armada desde los tags.
        $response->assertJsonPath('places.0.name', 'Chino Cerca')
            ->assertJsonPath('places.0.address', 'Monroe 2800')
            ->assertJsonPath('places.1.name', 'Súper Lejos');
    }

    public function test_valida_coordenadas_obligatorias(): void
    {
        $this->actingAsApi($this->user())
            ->getJson('/api/stores/nearby')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['lat', 'lng']);
    }
}
