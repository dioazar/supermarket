<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('unit')->default('un');
            $table->timestamps();
            $table->unique('name');
        });

        Schema::create('stores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('address')->nullable();
            $table->timestamps();
        });

        Schema::create('product_store', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->decimal('price', 10, 2)->nullable();
            $table->timestamps();
            $table->unique(['product_id', 'store_id']);
        });

        Schema::create('shopping_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('recurrence_days')->nullable();
            $table->timestamp('next_recurrence_at')->nullable();
            $table->timestamps();
        });

        Schema::create('list_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shopping_list_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('quantity', 8, 2)->default(1);
            $table->enum('status', ['pending', 'checked', 'missing'])->default('pending');
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();
            $table->unique(['shopping_list_id', 'product_id']);
        });

        Schema::create('pantry_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 8, 2)->default(0);
            $table->decimal('min_quantity', 8, 2)->default(1);
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pantry_items');
        Schema::dropIfExists('list_items');
        Schema::dropIfExists('shopping_lists');
        Schema::dropIfExists('product_store');
        Schema::dropIfExists('stores');
        Schema::dropIfExists('products');
    }
};
