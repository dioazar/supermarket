<?php

namespace App\Policies;

use App\Models\ShoppingList;
use App\Models\User;

class ShoppingListPolicy
{
    public function view(User $user, ShoppingList $list): bool
    {
        return $this->hasListPermission($user, $list, 'view-list');
    }

    public function update(User $user, ShoppingList $list): bool
    {
        return $this->hasListPermission($user, $list, 'edit-list');
    }

    public function share(User $user, ShoppingList $list): bool
    {
        return $this->hasListPermission($user, $list, 'share-list');
    }

    public function delete(User $user, ShoppingList $list): bool
    {
        return $this->hasListPermission($user, $list, 'delete-list');
    }

    /**
     * Check a spatie permission within the list's team context
     * (team_id = shopping_list id).
     */
    private function hasListPermission(User $user, ShoppingList $list, string $permission): bool
    {
        $previousTeamId = getPermissionsTeamId();

        setPermissionsTeamId($list->id);
        $user->unsetRelation('roles')->unsetRelation('permissions');
        $allowed = $user->hasPermissionTo($permission);

        setPermissionsTeamId($previousTeamId);
        $user->unsetRelation('roles')->unsetRelation('permissions');

        return $allowed;
    }
}
