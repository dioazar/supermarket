<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_path')->nullable()->after('email');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('name');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('unit');
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shopping_list_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');

        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('avatar_path'));
        Schema::table('categories', fn (Blueprint $table) => $table->dropColumn('image_path'));
        Schema::table('products', fn (Blueprint $table) => $table->dropColumn('image_path'));
    }
};
