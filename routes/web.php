<?php

use App\Http\Controllers\CategoryPageController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpensePageController;
use App\Http\Controllers\ImageController;
use App\Http\Controllers\ProductPageController;
use App\Http\Controllers\ListItemController;
use App\Http\Controllers\ListShareController;
use App\Http\Controllers\PantryController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RecommendationController;
use App\Http\Controllers\ShoppingListController;
use App\Http\Controllers\Api\NearbyStoreController;
use App\Http\Controllers\StoreController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('login'));

// Login con Google (web y app; la app pasa ?mobile=1&redirect_uri=...)
Route::get('/auth/google/redirect', [\App\Http\Controllers\Auth\GoogleController::class, 'redirect'])->name('google.redirect');
Route::get('/auth/google/callback', [\App\Http\Controllers\Auth\GoogleController::class, 'callback'])->name('google.callback');

Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Listas
    Route::get('/lists', [ShoppingListController::class, 'index'])->name('lists.index');
    Route::post('/lists', [ShoppingListController::class, 'store'])->name('lists.store');
    Route::get('/lists/{list}', [ShoppingListController::class, 'show'])->name('lists.show');
    Route::patch('/lists/{list}', [ShoppingListController::class, 'update'])->name('lists.update');
    Route::delete('/lists/{list}', [ShoppingListController::class, 'destroy'])->name('lists.destroy');
    Route::post('/lists/{list}/reset', [ShoppingListController::class, 'reset'])->name('lists.reset');

    // Ítems de lista
    Route::post('/lists/{list}/items', [ListItemController::class, 'store'])->name('lists.items.store');
    Route::patch('/items/{item}', [ListItemController::class, 'update'])->name('items.update');
    Route::delete('/items/{item}', [ListItemController::class, 'destroy'])->name('items.destroy');

    // Compartir listas
    Route::post('/lists/{list}/share', [ListShareController::class, 'store'])->name('lists.share.store');
    Route::delete('/lists/{list}/share/{user}', [ListShareController::class, 'destroy'])->name('lists.share.destroy');

    // Despensa / stock
    Route::get('/pantry', [PantryController::class, 'index'])->name('pantry.index');
    Route::post('/pantry', [PantryController::class, 'store'])->name('pantry.store');
    Route::patch('/pantry/{pantry}', [PantryController::class, 'update'])->name('pantry.update');
    Route::delete('/pantry/{pantry}', [PantryController::class, 'destroy'])->name('pantry.destroy');

    // Tiendas
    Route::get('/stores/nearby', [NearbyStoreController::class, 'index'])->name('stores.nearby');
    Route::get('/stores', [StoreController::class, 'index'])->name('stores.index');
    Route::post('/stores', [StoreController::class, 'store'])->name('stores.store');
    Route::patch('/stores/{store}', [StoreController::class, 'update'])->name('stores.update');
    Route::delete('/stores/{store}', [StoreController::class, 'destroy'])->name('stores.destroy');
    Route::post('/stores/{store}/products', [StoreController::class, 'attachProduct'])->name('stores.products.attach');
    Route::delete('/stores/{store}/products/{product}', [StoreController::class, 'detachProduct'])->name('stores.products.detach');

    // Gastos compartidos (estilo splitwise)
    Route::post('/lists/{list}/expenses', [ExpensePageController::class, 'store'])->name('lists.expenses.store');
    Route::delete('/expenses/{expense}', [ExpensePageController::class, 'destroy'])->name('expenses.destroy');

    // Categorías y productos (con imágenes)
    Route::get('/categories', [CategoryPageController::class, 'index'])->name('categories.index');
    Route::post('/categories', [CategoryPageController::class, 'store'])->name('categories.store');
    Route::patch('/categories/{category}', [CategoryPageController::class, 'update'])->name('categories.update');
    Route::delete('/categories/{category}', [CategoryPageController::class, 'destroy'])->name('categories.destroy');
    Route::post('/categories/{category}/image', [ImageController::class, 'categoryImage'])->name('categories.image');
    Route::get('/products', [ProductPageController::class, 'index'])->name('products.index');
    Route::post('/products', [ProductPageController::class, 'store'])->name('products.store');
    Route::patch('/products/{product}', [ProductPageController::class, 'update'])->name('products.update');
    Route::post('/products/{product}/image', [ImageController::class, 'productImage'])->name('products.image');

    // Recomendaciones
    Route::get('/recommendations', [RecommendationController::class, 'index'])->name('recommendations.index');

    // Perfil (Breeze)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
