<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FriendController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\HomeController;
use App\Http\Controllers\Api\ListController;
use App\Http\Controllers\Api\ListItemController;
use App\Http\Controllers\Api\NearbyStoreController;
use App\Http\Controllers\Api\PantryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\RecommendationController;
use App\Http\Controllers\Api\ShareController;
use App\Http\Controllers\Api\StoreController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::get('/auth/providers', fn () => response()->json([
    'google' => (bool) config('services.google.client_id'),
]));

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::get('/lists', [ListController::class, 'index']);
    Route::post('/lists', [ListController::class, 'store']);
    Route::get('/lists/{list}', [ListController::class, 'show']);
    Route::patch('/lists/{list}', [ListController::class, 'update']);
    Route::delete('/lists/{list}', [ListController::class, 'destroy']);
    Route::post('/lists/{list}/reset', [ListController::class, 'reset']);

    Route::post('/lists/{list}/items', [ListItemController::class, 'store']);
    Route::patch('/items/{item}', [ListItemController::class, 'update']);
    Route::delete('/items/{item}', [ListItemController::class, 'destroy']);

    Route::post('/lists/{list}/share', [ShareController::class, 'store']);
    Route::delete('/lists/{list}/share/{user}', [ShareController::class, 'destroy']);

    Route::get('/home', [HomeController::class, 'index']);
    Route::get('/friends', [FriendController::class, 'index']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar']);
    Route::post('/lists/{list}/expenses', [ExpenseController::class, 'store']);
    Route::delete('/expenses/{expense}', [ExpenseController::class, 'destroy']);
    Route::patch('/categories/{category}', [\App\Http\Controllers\Api\CategoryController::class, 'update']);
    Route::post('/categories/{category}/image', [\App\Http\Controllers\ImageController::class, 'categoryImage']);
    Route::post('/products/{product}/image', [\App\Http\Controllers\ImageController::class, 'productImage']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    Route::get('/pantry', [PantryController::class, 'index']);
    Route::post('/pantry', [PantryController::class, 'store']);
    Route::patch('/pantry/{pantry}', [PantryController::class, 'update']);
    Route::delete('/pantry/{pantry}', [PantryController::class, 'destroy']);

    Route::get('/stores/nearby', [NearbyStoreController::class, 'index']);
    Route::get('/stores', [StoreController::class, 'index']);
    Route::post('/stores', [StoreController::class, 'store']);
    Route::delete('/stores/{store}', [StoreController::class, 'destroy']);
    Route::post('/stores/{store}/products', [StoreController::class, 'attachProduct']);
    Route::delete('/stores/{store}/products/{product}', [StoreController::class, 'detachProduct']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::patch('/products/{product}', [ProductController::class, 'update']);
    Route::get('/recommendations', [RecommendationController::class, 'index']);
});
