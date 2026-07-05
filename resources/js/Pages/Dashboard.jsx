import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { Fragment, useMemo, useState } from 'react';

const STATUS_META = {
    green: { label: 'Tengo', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800', row: 'bg-white' },
    yellow: { label: 'Queda poco', dot: 'bg-amber-400', chip: 'bg-amber-100 text-amber-800', row: 'bg-amber-50' },
    red: { label: 'Me falta', dot: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800', row: 'bg-rose-50' },
};

function StatusChip({ status, active, onClick, count }) {
    const meta = STATUS_META[status];
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                    ? meta.chip + ' ring-2 ring-offset-1 ring-stone-300'
                    : 'bg-white text-stone-500 hover:bg-stone-50'
            }`}
        >
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
            {meta.label}
            <span className="text-xs opacity-70">{count}</span>
        </button>
    );
}

export default function Dashboard({ pantry, stores, categories, lists }) {
    // Por defecto: "¿qué necesito?" → rojo + amarillo
    const [statuses, setStatuses] = useState(['red', 'yellow']);
    const [storeId, setStoreId] = useState('');
    const [categoryId, setCategoryId] = useState('');

    const toggleStatus = (status) =>
        setStatuses((current) =>
            current.includes(status)
                ? current.filter((s) => s !== status)
                : [...current, status],
        );

    const store = stores.find((s) => String(s.id) === storeId);

    const { visible, unavailable, total } = useMemo(() => {
        let items = pantry.filter((item) => statuses.includes(item.status));
        if (categoryId) {
            // Una categoría madre incluye sus subcategorías.
            const ids = new Set([
                categoryId,
                ...categories
                    .filter((c) => String(c.parent_id ?? '') === categoryId)
                    .map((c) => String(c.id)),
            ]);
            items = items.filter((item) =>
                ids.has(String(item.category_id ?? '')),
            );
        }

        if (!store) {
            return { visible: items, unavailable: [], total: null };
        }

        const carried = items.filter((item) => store.prices[item.product_id]);
        const missing = items.filter((item) => !store.prices[item.product_id]);
        const sum = carried.reduce((acc, item) => {
            const info = store.prices[item.product_id];
            const needed = Math.max(item.min_quantity - item.quantity, 1);
            return acc + (info.price ?? 0) * needed;
        }, 0);

        return {
            visible: carried,
            unavailable: missing,
            total: Math.round(sum * 100) / 100,
        };
    }, [pantry, statuses, categoryId, store, categories]);

    const counts = {
        green: pantry.filter((i) => i.status === 'green').length,
        yellow: pantry.filter((i) => i.status === 'yellow').length,
        red: pantry.filter((i) => i.status === 'red').length,
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-bold text-stone-800">
                    ¿Qué necesito?
                </h2>
            }
        >
            <Head title="Inicio" />

            <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
                {/* Filtros */}
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {['red', 'yellow', 'green'].map((status) => (
                            <StatusChip
                                key={status}
                                status={status}
                                count={counts[status]}
                                active={statuses.includes(status)}
                                onClick={() => toggleStatus(status)}
                            />
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            className="grow rounded-xl border-stone-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                            value={storeId}
                            onChange={(e) => setStoreId(e.target.value)}
                        >
                            <option value="">
                                🏪 ¿A dónde vas? — todas las tiendas
                            </option>
                            {stores.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>

                        {categories.length > 0 && (
                            <select
                                className="rounded-xl border-stone-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                            >
                                <option value="">Todas las categorías</option>
                                {categories
                                    .filter((category) => !category.parent_id)
                                    .map((parent) => (
                                        <Fragment key={parent.id}>
                                            <option value={String(parent.id)}>
                                                {parent.name}
                                            </option>
                                            {categories
                                                .filter(
                                                    (c) =>
                                                        c.parent_id ===
                                                        parent.id,
                                                )
                                                .map((child) => (
                                                    <option
                                                        key={child.id}
                                                        value={String(
                                                            child.id,
                                                        )}
                                                    >
                                                        {'  ↳ '}
                                                        {child.name}
                                                    </option>
                                                ))}
                                        </Fragment>
                                    ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Resultado */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    {visible.length === 0 ? (
                        <p className="p-6 text-center text-sm text-stone-500">
                            {store
                                ? `Nada que comprar en ${store.name} con estos filtros 🎉`
                                : 'Nada con estos filtros 🎉'}
                        </p>
                    ) : (
                        <ul className="divide-y divide-stone-100">
                            {visible.map((item) => {
                                const meta = STATUS_META[item.status];
                                const info = store?.prices[item.product_id];
                                return (
                                    <li
                                        key={item.id}
                                        className={`flex items-center justify-between gap-3 px-4 py-3 ${meta.row}`}
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                className={`h-3 w-3 shrink-0 rounded-full ${meta.dot}`}
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-stone-800">
                                                    {item.product.name}
                                                </p>
                                                <p className="text-xs text-stone-500">
                                                    {meta.label} · {item.quantity}/
                                                    {item.min_quantity}{' '}
                                                    {item.product.unit}
                                                    {item.category &&
                                                        ` · ${item.category.name}`}
                                                </p>
                                            </div>
                                        </div>
                                        {info && (
                                            <span
                                                className={`shrink-0 text-sm font-semibold ${
                                                    info.on_sale
                                                        ? 'text-amber-600'
                                                        : 'text-stone-700'
                                                }`}
                                            >
                                                {info.price != null
                                                    ? `$${info.price}`
                                                    : 's/precio'}
                                                {info.on_sale && ' 🏷️'}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {store && total !== null && visible.length > 0 && (
                        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-4 py-3">
                            <span className="text-sm text-stone-600">
                                Total estimado en {store.name}
                            </span>
                            <span className="font-bold text-stone-800">
                                ${total}
                            </span>
                        </div>
                    )}
                </div>

                {store && unavailable.length > 0 && (
                    <p className="text-xs text-stone-500">
                        <span className="font-semibold text-rose-600">
                            {store.name} no tiene:
                        </span>{' '}
                        {unavailable.map((item) => item.product.name).join(' · ')}
                    </p>
                )}

                {/* Accesos rápidos */}
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="font-semibold text-stone-800">
                            Mis listas
                        </h3>
                        <Link
                            href={route('lists.index')}
                            className="text-sm font-medium text-emerald-600 hover:underline"
                        >
                            Ver todas →
                        </Link>
                    </div>
                    {lists.length === 0 ? (
                        <p className="text-sm text-stone-500">
                            Todavía no tenés listas.
                        </p>
                    ) : (
                        <ul className="divide-y divide-stone-100">
                            {lists.map((list) => (
                                <li
                                    key={list.id}
                                    className="flex items-center justify-between py-2"
                                >
                                    <Link
                                        href={route('lists.show', list.id)}
                                        className="font-medium text-emerald-700 hover:underline"
                                    >
                                        {list.name}
                                    </Link>
                                    <span className="text-sm text-stone-500">
                                        {list.checked_count}/{list.items_count}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
