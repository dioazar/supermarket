<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class ShoppingList extends Model
{
    protected $fillable = ['owner_id', 'name', 'recurrence_days', 'next_recurrence_at'];

    protected $casts = [
        'next_recurrence_at' => 'datetime',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ListItem::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Lists where the user has any role (owner/editor/viewer), via
     * spatie's team-scoped model_has_roles (team_id = shopping_list id).
     */
    public function scopeAccessibleBy(Builder $query, User $user): Builder
    {
        return $query->whereIn('id', DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', $user->id)
            ->pluck(config('permission.column_names.team_foreign_key')));
    }

    /** Users with access to this list, with their role name attached. */
    public function members()
    {
        $teamKey = config('permission.column_names.team_foreign_key');

        return User::query()
            ->join('model_has_roles as mhr', function ($join) use ($teamKey) {
                $join->on('mhr.model_id', '=', 'users.id')
                    ->where('mhr.model_type', User::class)
                    ->where("mhr.$teamKey", $this->id);
            })
            ->join('roles', 'roles.id', '=', 'mhr.role_id')
            ->select('users.id', 'users.name', 'users.email', 'roles.name as role');
    }
}
