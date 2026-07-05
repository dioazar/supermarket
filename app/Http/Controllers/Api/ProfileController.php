<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ImageStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
        ]);

        $request->user()->update($data);

        return response()->json($request->user()->only('id', 'name', 'email', 'avatar_url'));
    }

    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            // Cuentas creadas con Google pueden no tener contraseña todavía
            'current_password' => $user->password !== null
                ? ['required', 'current_password']
                : ['nullable'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $user->update(['password' => Hash::make($request->input('password'))]);

        return response()->json(['status' => 'ok']);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:8192'],
        ]);

        $user = $request->user();

        ImageStorage::delete($user->avatar_path);
        $user->update([
            'avatar_path' => ImageStorage::store($request->file('avatar'), 'avatars', 256),
        ]);

        return response()->json($user->only('id', 'name', 'email', 'avatar_url'));
    }
}
