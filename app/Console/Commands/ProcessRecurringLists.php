<?php

namespace App\Console\Commands;

use App\Models\ShoppingList;
use Illuminate\Console\Command;

class ProcessRecurringLists extends Command
{
    protected $signature = 'superlista:process-recurring';

    protected $description = 'Reset recurring shopping lists whose next run date has arrived';

    public function handle(): int
    {
        $due = ShoppingList::whereNotNull('recurrence_days')
            ->whereNotNull('next_recurrence_at')
            ->where('next_recurrence_at', '<=', now())
            ->get();

        foreach ($due as $list) {
            $list->items()->update([
                'status' => 'pending',
                'checked_at' => null,
            ]);

            $list->update([
                'next_recurrence_at' => now()->addDays($list->recurrence_days),
            ]);

            $this->info("Lista '{$list->name}' reiniciada. Próxima: {$list->next_recurrence_at}");
        }

        $this->info("Procesadas: {$due->count()}");

        return self::SUCCESS;
    }
}
