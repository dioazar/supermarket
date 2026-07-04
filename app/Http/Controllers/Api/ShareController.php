<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShoppingList;
use App\Models\User;
use App\Services\ListSharing;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ShareController extends Controller
{
    public function store(Request $request, ShoppingList $list)
    {
        $this->authorize('share', $list);

        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'role' => ['required', 'in:list-editor,list-viewer'],
        ]);

        $target = User::where('email', $data['email'])->firstOrFail();

        if ($target->id === $list->owner_id) {
            throw ValidationException::withMessages([
                'email' => 'Ese usuario es el dueño de la lista.',
            ]);
        }

        ListSharing::setRole($target, $list, $data['role']);

        return response()->json($list->members()->get());
    }

    public function destroy(Request $request, ShoppingList $list, User $user)
    {
        $this->authorize('share', $list);

        if ($user->id === $list->owner_id) {
            return response()->json(['message' => 'No podés quitar al dueño.'], 422);
        }

        ListSharing::removeUser($user, $list);

        return response()->json($list->members()->get());
    }
}
