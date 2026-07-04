<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = ['view-list', 'edit-list', 'share-list', 'delete-list'];
        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        // Global roles (team_id null) assigned per-list via the team context.
        $owner = Role::findOrCreate('list-owner', 'web');
        $owner->syncPermissions($permissions);

        $editor = Role::findOrCreate('list-editor', 'web');
        $editor->syncPermissions(['view-list', 'edit-list']);

        $viewer = Role::findOrCreate('list-viewer', 'web');
        $viewer->syncPermissions(['view-list']);
    }
}
