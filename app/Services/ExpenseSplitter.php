<?php

namespace App\Services;

use App\Models\ShoppingList;

/**
 * División de gastos estilo Splitwise: el total se reparte en partes iguales
 * entre los miembros de la lista, se descuenta lo que cada uno ya puso, y las
 * deudas se simplifican en la menor cantidad de transferencias posible.
 */
class ExpenseSplitter
{
    public static function settle(ShoppingList $list): array
    {
        $members = $list->members()->get();
        $expenses = $list->expenses()->with('user:id,name')->latest()->get();

        if ($members->isEmpty()) {
            return ['expenses' => [], 'total' => 0, 'share' => 0, 'balances' => [], 'transfers' => []];
        }

        $paidBy = $expenses->groupBy('user_id')->map(fn ($group) => (float) $group->sum('amount'));
        $total = (float) $expenses->sum('amount');
        $share = round($total / $members->count(), 2);

        $balances = $members->map(fn ($member) => [
            'user_id' => $member->id,
            'name' => $member->name,
            'paid' => round($paidBy[$member->id] ?? 0, 2),
            'share' => $share,
            // positivo: puso de más, le deben. negativo: debe.
            'balance' => round(($paidBy[$member->id] ?? 0) - $share, 2),
        ])->values();

        // Simplificación greedy: el que más debe le paga al que más puso.
        $debtors = $balances->filter(fn ($b) => $b['balance'] < -0.01)
            ->map(fn ($b) => ['name' => $b['name'], 'amount' => -$b['balance']])
            ->sortByDesc('amount')->values()->all();
        $creditors = $balances->filter(fn ($b) => $b['balance'] > 0.01)
            ->map(fn ($b) => ['name' => $b['name'], 'amount' => $b['balance']])
            ->sortByDesc('amount')->values()->all();

        $transfers = [];
        $i = 0;
        $j = 0;

        while ($i < count($debtors) && $j < count($creditors)) {
            $amount = round(min($debtors[$i]['amount'], $creditors[$j]['amount']), 2);

            if ($amount > 0.01) {
                $transfers[] = [
                    'from' => $debtors[$i]['name'],
                    'to' => $creditors[$j]['name'],
                    'amount' => $amount,
                    'phrase' => "{$debtors[$i]['name']} le tiene que dar \${$amount} a {$creditors[$j]['name']}",
                ];
            }

            $debtors[$i]['amount'] -= $amount;
            $creditors[$j]['amount'] -= $amount;

            if ($debtors[$i]['amount'] <= 0.01) {
                $i++;
            }
            if ($creditors[$j]['amount'] <= 0.01) {
                $j++;
            }
        }

        return [
            'expenses' => $expenses->map(fn ($expense) => [
                'id' => $expense->id,
                'user_id' => $expense->user_id,
                'user' => $expense->user->name,
                'amount' => (float) $expense->amount,
                'note' => $expense->note,
                'created_at' => $expense->created_at->toDateTimeString(),
            ])->values()->all(),
            'total' => round($total, 2),
            'share' => $share,
            'balances' => $balances->all(),
            'transfers' => $transfers,
        ];
    }
}
