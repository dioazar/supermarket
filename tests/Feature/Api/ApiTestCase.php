<?php

namespace Tests\Feature\Api;

use App\Models\Product;
use App\Models\ShoppingList;
use App\Models\User;
use App\Services\ListSharing;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

abstract class ApiTestCase extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Los roles por lista (spatie teams) son requisito de casi todo.
        $this->seed(RoleSeeder::class);
    }

    protected function user(array $attributes = []): User
    {
        return User::factory()->create($attributes);
    }

    protected function actingAsApi(User $user): static
    {
        Sanctum::actingAs($user);

        return $this;
    }

    protected function makeList(
        User $owner,
        string $name = 'Compra semanal',
        ?int $recurrenceDays = null,
    ): ShoppingList {
        $list = ShoppingList::create([
            'owner_id' => $owner->id,
            'name' => $name,
            'recurrence_days' => $recurrenceDays,
            'next_recurrence_at' => $recurrenceDays ? now()->addDays($recurrenceDays) : null,
        ]);

        ListSharing::setRole($owner, $list, 'list-owner');

        return $list;
    }

    protected function productFor(User $user, string $name, array $attributes = []): Product
    {
        return Product::findOrCreateFor($user, $name, $attributes);
    }
}
