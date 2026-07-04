<?php

namespace Database\Seeders;

use App\Models\PantryItem;
use App\Models\Product;
use App\Models\ShoppingList;
use App\Models\Store;
use App\Models\User;
use App\Services\ListSharing;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $demo = User::firstOrCreate(
            ['email' => 'demo@superlista.test'],
            ['name' => 'Demo', 'password' => Hash::make('password')]
        );

        $ana = User::firstOrCreate(
            ['email' => 'ana@superlista.test'],
            ['name' => 'Ana', 'password' => Hash::make('password')]
        );

        $products = collect([
            ['name' => 'Leche', 'category' => 'Lácteos', 'unit' => 'lt'],
            ['name' => 'Yerba mate', 'category' => 'Almacén', 'unit' => 'kg'],
            ['name' => 'Pan', 'category' => 'Panadería', 'unit' => 'kg'],
            ['name' => 'Huevos', 'category' => 'Almacén', 'unit' => 'docena'],
            ['name' => 'Queso cremoso', 'category' => 'Lácteos', 'unit' => 'kg'],
            ['name' => 'Fideos', 'category' => 'Almacén', 'unit' => 'paq'],
            ['name' => 'Arroz', 'category' => 'Almacén', 'unit' => 'kg'],
            ['name' => 'Aceite', 'category' => 'Almacén', 'unit' => 'lt'],
            ['name' => 'Papel higiénico', 'category' => 'Limpieza', 'unit' => 'paq'],
            ['name' => 'Detergente', 'category' => 'Limpieza', 'unit' => 'un'],
            ['name' => 'Manzanas', 'category' => 'Verdulería', 'unit' => 'kg'],
            ['name' => 'Tomates', 'category' => 'Verdulería', 'unit' => 'kg'],
        ])->mapWithKeys(function ($data) {
            return [$data['name'] => Product::firstOrCreate(['name' => $data['name']], $data)];
        });

        // Tiendas del usuario demo, con precios distintos
        $coto = Store::firstOrCreate(['user_id' => $demo->id, 'name' => 'Coto'], ['address' => 'Av. Cabildo 545', 'lat' => -34.5688, 'lng' => -58.4488, 'website' => 'https://www.cotodigital3.com.ar']);
        $dia = Store::firstOrCreate(['user_id' => $demo->id, 'name' => 'Día'], ['address' => 'Monroe 2801', 'lat' => -34.5563, 'lng' => -58.4614, 'website' => 'https://diaonline.supermercadosdia.com.ar']);
        $chino = Store::firstOrCreate(['user_id' => $demo->id, 'name' => 'Chino de la esquina'], ['address' => 'A la vuelta', 'lat' => -34.5620, 'lng' => -58.4560]);

        $coto->products()->syncWithoutDetaching([
            $products['Leche']->id => ['price' => 1450],
            $products['Yerba mate']->id => ['price' => 8900],
            $products['Pan']->id => ['price' => 3200],
            $products['Huevos']->id => ['price' => 4100],
            $products['Queso cremoso']->id => ['price' => 12500],
            $products['Fideos']->id => ['price' => 1350],
            $products['Arroz']->id => ['price' => 2100],
            $products['Aceite']->id => ['price' => 3900],
            $products['Papel higiénico']->id => ['price' => 5600],
            $products['Detergente']->id => ['price' => 2800],
        ]);

        $dia->products()->syncWithoutDetaching([
            $products['Leche']->id => ['price' => 1390],
            $products['Pan']->id => ['price' => 2900],
            $products['Fideos']->id => ['price' => 1200],
            $products['Arroz']->id => ['price' => 1950],
            $products['Detergente']->id => ['price' => 2500],
        ]);

        $chino->products()->syncWithoutDetaching([
            $products['Leche']->id => ['price' => 1500],
            $products['Manzanas']->id => ['price' => 2400],
            $products['Tomates']->id => ['price' => 3100],
            $products['Huevos']->id => ['price' => 4300],
        ]);

        // Ofertas activas de ejemplo
        $coto->products()->updateExistingPivot($products['Yerba mate']->id, [
            'sale_price' => 7490, 'sale_ends_at' => now()->addDays(3)->toDateString(),
        ]);
        $dia->products()->updateExistingPivot($products['Leche']->id, [
            'sale_price' => 1190, 'sale_ends_at' => now()->addDays(5)->toDateString(),
        ]);
        $dia->products()->updateExistingPivot($products['Detergente']->id, [
            'sale_price' => 1990, 'sale_ends_at' => now()->addDays(2)->toDateString(),
        ]);

        // Despensa: algunas cosas en falta
        $pantry = [
            ['product' => 'Leche', 'quantity' => 0, 'min' => 2],
            ['product' => 'Yerba mate', 'quantity' => 0.5, 'min' => 1],
            ['product' => 'Arroz', 'quantity' => 3, 'min' => 1],
            ['product' => 'Aceite', 'quantity' => 1, 'min' => 1],
            ['product' => 'Papel higiénico', 'quantity' => 0, 'min' => 2],
        ];

        foreach ($pantry as $row) {
            PantryItem::updateOrCreate(
                ['user_id' => $demo->id, 'product_id' => $products[$row['product']]->id],
                ['quantity' => $row['quantity'], 'min_quantity' => $row['min']]
            );
        }

        // Lista semanal recurrente, compartida con Ana como editora
        $semanal = ShoppingList::firstOrCreate(
            ['owner_id' => $demo->id, 'name' => 'Compra semanal'],
            ['recurrence_days' => 7, 'next_recurrence_at' => now()->addDays(7)]
        );

        ListSharing::setRole($demo, $semanal, 'list-owner');
        ListSharing::setRole($ana, $semanal, 'list-editor');

        foreach (['Leche' => 2, 'Pan' => 1, 'Huevos' => 1, 'Queso cremoso' => 0.5, 'Manzanas' => 1.5] as $name => $qty) {
            $semanal->items()->updateOrCreate(
                ['product_id' => $products[$name]->id],
                ['quantity' => $qty, 'added_by' => $demo->id]
            );
        }

        // Lista puntual sin recurrencia
        $asado = ShoppingList::firstOrCreate(
            ['owner_id' => $ana->id, 'name' => 'Asado del sábado']
        );

        ListSharing::setRole($ana, $asado, 'list-owner');
        ListSharing::setRole($demo, $asado, 'list-viewer');

        foreach (['Tomates' => 1, 'Pan' => 2, 'Detergente' => 1] as $name => $qty) {
            $asado->items()->updateOrCreate(
                ['product_id' => $products[$name]->id],
                ['quantity' => $qty, 'added_by' => $ana->id]
            );
        }
    }
}
