import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const STATUS_META = {
    green: { label: 'Tengo', dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-800', row: '' },
    yellow: { label: 'Queda poco', dot: 'bg-amber-400', chip: 'bg-amber-100 text-amber-800', row: 'bg-amber-50' },
    red: { label: 'Me falta', dot: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800', row: 'bg-rose-50' },
};

export default function Index({ items, products, categories = [] }) {
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        product_id: '',
        product_name: '',
        quantity: 1,
        min_quantity: 1,
        category_id: '',
        category_name: '',
    });

    const submit = (e) => {
        e.preventDefault();
        router.post(
            route('pantry.store'),
            {
                ...data,
                category_id:
                    data.category_id === '__new__' || data.category_id === ''
                        ? null
                        : data.category_id,
                category_name:
                    data.category_id === '__new__' ? data.category_name : null,
            },
            { preserveScroll: true, onSuccess: () => reset() },
        );
    };

    const adjust = (item, delta) =>
        router.patch(
            route('pantry.update', item.id),
            { quantity: Math.max(0, item.quantity + delta) },
            { preserveScroll: true },
        );

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Despensa (mi stock)
                </h2>
            }
        >
            <Head title="Despensa" />

            <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
                <form
                    onSubmit={submit}
                    className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow"
                >
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Producto
                        </label>
                        <select
                            className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm"
                            value={data.product_id}
                            onChange={(e) =>
                                setData('product_id', e.target.value)
                            }
                        >
                            <option value="">— producto nuevo —</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.unit})
                                </option>
                            ))}
                        </select>
                    </div>
                    {!data.product_id && (
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Nombre nuevo
                            </label>
                            <TextInput
                                className="mt-1 block"
                                value={data.product_name}
                                onChange={(e) =>
                                    setData('product_name', e.target.value)
                                }
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Tengo
                        </label>
                        <TextInput
                            type="number"
                            step="0.01"
                            min="0"
                            className="mt-1 block w-24"
                            value={data.quantity}
                            onChange={(e) =>
                                setData('quantity', e.target.value)
                            }
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Mínimo
                        </label>
                        <TextInput
                            type="number"
                            step="0.01"
                            min="0"
                            className="mt-1 block w-24"
                            value={data.min_quantity}
                            onChange={(e) =>
                                setData('min_quantity', e.target.value)
                            }
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Categoría
                        </label>
                        <select
                            className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm"
                            value={data.category_id}
                            onChange={(e) =>
                                setData('category_id', e.target.value)
                            }
                        >
                            <option value="">— sin categoría —</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                            <option value="__new__">+ Nueva categoría…</option>
                        </select>
                    </div>
                    {data.category_id === '__new__' && (
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Nombre de la categoría
                            </label>
                            <TextInput
                                className="mt-1 block w-40"
                                placeholder="Ej: Limpieza"
                                value={data.category_name}
                                onChange={(e) =>
                                    setData('category_name', e.target.value)
                                }
                            />
                        </div>
                    )}
                    <PrimaryButton disabled={processing}>Guardar</PrimaryButton>
                    <InputError
                        message={
                            errors.product_id ||
                            errors.product_name ||
                            errors.quantity ||
                            errors.min_quantity
                        }
                    />
                </form>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setStatusFilter('')}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                            statusFilter === ''
                                ? 'bg-stone-800 text-white'
                                : 'bg-white text-stone-500'
                        }`}
                    >
                        Todos
                    </button>
                    {Object.entries(STATUS_META).map(([status, meta]) => (
                        <button
                            key={status}
                            onClick={() =>
                                setStatusFilter(
                                    statusFilter === status ? '' : status,
                                )
                            }
                            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                                statusFilter === status
                                    ? meta.chip + ' ring-2 ring-stone-300'
                                    : 'bg-white text-stone-500'
                            }`}
                        >
                            <span
                                className={`h-2.5 w-2.5 rounded-full ${meta.dot}`}
                            />
                            {meta.label}
                        </button>
                    ))}
                    {categories.length > 0 && (
                        <select
                            className="rounded-full border-gray-200 py-1.5 text-sm shadow-sm"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">Todas las categorías</option>
                            {categories.map((category) => (
                                <option
                                    key={category.id}
                                    value={String(category.id)}
                                >
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="overflow-hidden rounded-lg bg-white shadow">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Producto</th>
                                <th className="px-4 py-3">Tengo</th>
                                <th className="px-4 py-3">Mínimo</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Categoría</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items
                                .filter(
                                    (item) =>
                                        (!statusFilter ||
                                            item.status === statusFilter) &&
                                        (!categoryFilter ||
                                            String(item.category_id ?? '') ===
                                                categoryFilter),
                                )
                                .map((item) => {
                                const meta = STATUS_META[item.status];
                                return (
                                    <tr
                                        key={item.id}
                                        className={meta.row}
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {item.product.name}
                                            <span className="ml-1 text-xs text-gray-500">
                                                ({item.product.unit})
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-2">
                                                <button
                                                    className="h-7 w-7 rounded-full bg-gray-200 font-bold hover:bg-gray-300"
                                                    onClick={() =>
                                                        adjust(item, -1)
                                                    }
                                                >
                                                    −
                                                </button>
                                                <span className="w-10 text-center">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    className="h-7 w-7 rounded-full bg-gray-200 font-bold hover:bg-gray-300"
                                                    onClick={() =>
                                                        adjust(item, 1)
                                                    }
                                                >
                                                    +
                                                </button>
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {item.min_quantity}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${meta.chip}`}
                                            >
                                                <span
                                                    className={`h-2 w-2 rounded-full ${meta.dot}`}
                                                />
                                                {meta.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                className="rounded-md border-gray-200 py-1 text-xs shadow-sm"
                                                value={item.category_id ?? ''}
                                                onChange={(e) =>
                                                    router.patch(
                                                        route(
                                                            'pantry.update',
                                                            item.id,
                                                        ),
                                                        {
                                                            category_id:
                                                                e.target.value ||
                                                                null,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                <option value="">—</option>
                                                {categories.map((category) => (
                                                    <option
                                                        key={category.id}
                                                        value={category.id}
                                                    >
                                                        {category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                className="text-xs text-red-600 hover:underline"
                                                onClick={() =>
                                                    router.delete(
                                                        route(
                                                            'pantry.destroy',
                                                            item.id,
                                                        ),
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                Quitar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="6"
                                        className="px-4 py-6 text-center text-gray-500"
                                    >
                                        Tu despensa está vacía.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
