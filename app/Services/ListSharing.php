<?php

namespace App\Services;

use App\Models\ShoppingList;
use App\Models\User;

class ListSharing
{
    /** Assign (or replace) the user's role on a list, using spatie teams. */
    public static function setRole(User $user, ShoppingList $list, string $role): void
    {
        self::withTeam($list, fn () => self::freshForTeam($user)->syncRoles([$role]));
        self::freshForTeam($user);
    }

    public static function removeUser(User $user, ShoppingList $list): void
    {
        self::withTeam($list, fn () => self::freshForTeam($user)->syncRoles([]));
        self::freshForTeam($user);
    }

    public static function roleOn(User $user, ShoppingList $list): ?string
    {
        $role = self::withTeam($list, fn () => self::freshForTeam($user)->getRoleNames()->first());
        self::freshForTeam($user);

        return $role;
    }

    /** Usuarios con los que el usuario comparte (o le compartieron) alguna lista. */
    public static function friendsOf(User $user)
    {
        $teamKey = config('permission.column_names.team_foreign_key');

        $myListIds = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', $user->id)
            ->pluck($teamKey);

        $friendIds = \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->whereIn($teamKey, $myListIds)
            ->where('model_id', '!=', $user->id)
            ->distinct()
            ->pluck('model_id');

        return User::whereIn('id', $friendIds)->orderBy('name')
            ->get(['id', 'name', 'email', 'avatar_path']);
    }

    private static function withTeam(ShoppingList $list, callable $callback)
    {
        $previousTeamId = getPermissionsTeamId();
        setPermissionsTeamId($list->id);

        try {
            return $callback();
        } finally {
            setPermissionsTeamId($previousTeamId);
        }
    }

    /** Spatie caches the roles relation per model; drop it when switching team context. */
    private static function freshForTeam(User $user): User
    {
        return $user->unsetRelation('roles')->unsetRelation('permissions');
    }
}
