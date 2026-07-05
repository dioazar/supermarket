<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FriendController extends Controller
{
    /** Usuarios con los que compartís (o te compartieron) alguna lista. */
    public function index(Request $request)
    {
        $teamKey = config('permission.column_names.team_foreign_key');
        $userId = $request->user()->id;

        $myListIds = DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', $userId)
            ->pluck($teamKey);

        $friendIds = DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->whereIn($teamKey, $myListIds)
            ->where('model_id', '!=', $userId)
            ->distinct()
            ->pluck('model_id');

        return response()->json(
            User::whereIn('id', $friendIds)
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'avatar_path'])
        );
    }
}
