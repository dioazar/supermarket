<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->decimal('lat', 10, 7)->nullable()->after('address');
            $table->decimal('lng', 10, 7)->nullable()->after('lat');
            $table->string('website')->nullable()->after('lng');
        });

        Schema::table('product_store', function (Blueprint $table) {
            $table->decimal('sale_price', 10, 2)->nullable()->after('price');
            $table->date('sale_ends_at')->nullable()->after('sale_price');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['lat', 'lng', 'website']);
        });

        Schema::table('product_store', function (Blueprint $table) {
            $table->dropColumn(['sale_price', 'sale_ends_at']);
        });
    }
};
