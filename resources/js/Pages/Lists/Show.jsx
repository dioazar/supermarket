import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const ROLE_LABELS = {
    'list-owner': 'Dueño',
    'list-editor': 'Editor',
    'list-viewer': 'Solo lectura',
};

const STATUS_STYLES = {
    pending: 'bg-white',
    checked: 'bg-green-50',
    missing: 'bg-red-50',
};

function EditListForm({ list, onDone }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: list.name,
        recurrence_days: list.recurrence_days ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('lists.update', list.id), {
            preserveScroll: true,
            onSuccess: onDone,
        });
    };

    return (
        <form
            onSubmit={submit}
            className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow"
        >
            <div className="grow">
                <label className="text-sm font-medium text-gray-700">
                    Nombre de la lista
                </label>
                <TextInput
                    className="mt-1 block w-full"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                />
                <InputError message={errors.name} className="mt-1" />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700">
                    Repetir cada (días)
                </label>
                <TextInput
                    type="number"
                    min="1"
                    className="mt-1 block w-28"
                    placeholder="—"
                    value={data.recurrence_days}
                    onChange={(e) =>
                        setData('recurrence_days', e.target.value)
                    }
                />
                <InputError
                    message={errors.recurrence_days}
                    className="mt-1"
                />
            </div>
            <PrimaryButton disabled={processing}>Guardar</PrimaryButton>
            <SecondaryButton type="button" onClick={onDone}>
                Cancelar
            </SecondaryButton>
        </form>
    );
}

function QuantityEditor({ item }) {
    const save = (quantity) => {
        if (!(quantity > 0) || quantity === item.quantity) return;
        router.patch(
            route('items.update', item.id),
            { quantity },
            { preserveScroll: true },
        );
    };

    return (
        <span className="flex items-center gap-1">
            <button
                type="button"
                disabled={item.quantity <= 1}
                onClick={() => save(item.quantity - 1)}
                className="h-6 w-6 rounded-md bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
            >
                −
            </button>
            <input
                type="number"
                step="0.01"
                min="0.01"
                key={item.quantity}
                defaultValue={item.quantity}
                onBlur={(e) => save(Number(e.target.value))}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur();
                }}
                className="w-16 rounded-md border-gray-300 px-1 py-0.5 text-center text-xs shadow-sm"
            />
            <button
                type="button"
                onClick={() => save(item.quantity + 1)}
                className="h-6 w-6 rounded-md bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100"
            >
                +
            </button>
            <span className="text-xs text-gray-500">{item.product.unit}</span>
        </span>
    );
}

function AddItemForm({ list, products }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        product_id: '',
        product_name: '',
        quantity: 1,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('lists.items.store', list.id), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
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
                    onChange={(e) => {
                        setData('product_id', e.target.value);
                    }}
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
                        placeholder="Ej: Café"
                        value={data.product_name}
                        onChange={(e) =>
                            setData('product_name', e.target.value)
                        }
                    />
                </div>
            )}
            <div>
                <label className="text-sm font-medium text-gray-700">
                    Cantidad
                </label>
                <TextInput
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="mt-1 block w-24"
                    value={data.quantity}
                    onChange={(e) => setData('quantity', e.target.value)}
                />
            </div>
            <PrimaryButton disabled={processing}>Agregar</PrimaryButton>
            <InputError
                message={
                    errors.product_id || errors.product_name || errors.quantity
                }
            />
        </form>
    );
}

function ExpensesSection({ list, expenses }) {
    const { data, setData, post, processing, reset } = useForm({
        amount: '',
        note: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('lists.expenses.store', list.id), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-1 font-semibold text-gray-800">
                💸 Gastos compartidos
            </h3>
            <p className="mb-3 text-sm text-gray-500">
                Cada uno anota lo que gastó y el total se divide en partes
                iguales.
            </p>

            <form onSubmit={submit} className="mb-4 flex flex-wrap items-end gap-2">
                <div>
                    <label className="text-sm font-medium text-gray-700">
                        Gasté ($)
                    </label>
                    <TextInput
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="mt-1 block w-32"
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                    />
                </div>
                <div className="grow">
                    <label className="text-sm font-medium text-gray-700">
                        Nota (opcional)
                    </label>
                    <TextInput
                        className="mt-1 block w-full"
                        placeholder="Ej: carnicería"
                        value={data.note}
                        onChange={(e) => setData('note', e.target.value)}
                    />
                </div>
                <SecondaryButton type="submit" disabled={processing}>
                    Anotar
                </SecondaryButton>
            </form>

            {expenses.expenses.length > 0 && (
                <>
                    <ul className="mb-3 divide-y divide-gray-100 text-sm">
                        {expenses.expenses.map((expense) => (
                            <li
                                key={expense.id}
                                className="flex items-center justify-between py-2"
                            >
                                <span>
                                    <span className="font-medium">
                                        {expense.user}
                                    </span>{' '}
                                    puso ${expense.amount}
                                    {expense.note && (
                                        <span className="text-gray-500">
                                            {' '}
                                            · {expense.note}
                                        </span>
                                    )}
                                </span>
                                <button
                                    className="text-xs text-rose-600 hover:underline"
                                    onClick={() =>
                                        router.delete(
                                            route(
                                                'expenses.destroy',
                                                expense.id,
                                            ),
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    Quitar
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="mb-3 rounded-xl bg-stone-50 p-3 text-sm">
                        <p className="mb-2">
                            Total{' '}
                            <span className="font-bold">
                                ${expenses.total}
                            </span>{' '}
                            · a cada uno le toca{' '}
                            <span className="font-bold">
                                ${expenses.share}
                            </span>
                        </p>
                        <ul className="space-y-1">
                            {expenses.balances.map((balance) => (
                                <li
                                    key={balance.user_id}
                                    className="flex justify-between"
                                >
                                    <span>{balance.name}</span>
                                    <span
                                        className={
                                            balance.balance >= 0
                                                ? 'font-medium text-emerald-700'
                                                : 'font-medium text-rose-600'
                                        }
                                    >
                                        puso ${balance.paid} (
                                        {balance.balance >= 0 ? '+' : ''}
                                        {balance.balance})
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {expenses.transfers.length > 0 ? (
                        <div className="space-y-1">
                            {expenses.transfers.map((transfer, index) => (
                                <p
                                    key={index}
                                    className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800"
                                >
                                    👉 {transfer.phrase}
                                </p>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm font-medium text-emerald-700">
                            ✓ Cuentas saldadas, nadie debe nada.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

function ShareSection({ list, members, friends = [] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        role: 'list-editor',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('lists.share.store', list.id), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <div className="rounded-lg bg-white p-4 shadow">
            <h3 className="mb-3 font-semibold text-gray-800">Compartida con</h3>
            <ul className="mb-4 divide-y text-sm">
                {members.map((member) => (
                    <li
                        key={member.id}
                        className="flex items-center justify-between py-2"
                    >
                        <span>
                            {member.name}{' '}
                            <span className="text-gray-500">
                                ({member.email})
                            </span>
                        </span>
                        <span className="flex items-center gap-2">
                            {member.id === list.owner_id ? (
                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                                    {ROLE_LABELS[member.role] ?? member.role}
                                </span>
                            ) : (
                                <select
                                    className="rounded-full border-gray-300 py-1 pl-2 pr-7 text-xs font-medium shadow-sm"
                                    value={member.role}
                                    onChange={(e) =>
                                        router.post(
                                            route('lists.share.store', list.id),
                                            {
                                                email: member.email,
                                                role: e.target.value,
                                            },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <option value="list-editor">Editor</option>
                                    <option value="list-viewer">
                                        Solo lectura
                                    </option>
                                </select>
                            )}
                            {member.id !== list.owner_id && (
                                <button
                                    className="text-xs text-red-600 hover:underline"
                                    onClick={() =>
                                        router.delete(
                                            route('lists.share.destroy', [
                                                list.id,
                                                member.id,
                                            ]),
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    Quitar
                                </button>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
            {friends.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {friends
                        .filter(
                            (friend) =>
                                !members.some((m) => m.id === friend.id),
                        )
                        .map((friend) => (
                            <button
                                key={friend.id}
                                type="button"
                                className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-emerald-50"
                                onClick={() => setData('email', friend.email)}
                            >
                                + {friend.name}
                            </button>
                        ))}
                </div>
            )}
            <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                <div className="grow">
                    <label className="text-sm font-medium text-gray-700">
                        Email del usuario
                    </label>
                    <TextInput
                        type="email"
                        className="mt-1 block w-full"
                        placeholder="ana@superlista.test"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    <InputError message={errors.email} className="mt-1" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">
                        Rol
                    </label>
                    <select
                        className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm"
                        value={data.role}
                        onChange={(e) => setData('role', e.target.value)}
                    >
                        <option value="list-editor">Editor</option>
                        <option value="list-viewer">Solo lectura</option>
                    </select>
                </div>
                <SecondaryButton type="submit" disabled={processing}>
                    Compartir
                </SecondaryButton>
            </form>
        </div>
    );
}

export default function Show({
    list,
    items,
    members,
    products,
    myRole,
    can,
    onlineStores = [],
    expenses,
    friends = [],
}) {
    const cartText = () =>
        '🛒 ' +
        list.name +
        '\n' +
        items
            .filter((item) => item.status !== 'checked')
            .map(
                (item) =>
                    `- ${item.quantity} ${item.product.unit} ${item.product.name}`,
            )
            .join('\n');

    const exportCart = async (store) => {
        await navigator.clipboard?.writeText(cartText());
        if (store) {
            window.open(store.website, '_blank');
        } else {
            alert('Carrito copiado al portapapeles ✓');
        }
    };

    const [shoppingMode, setShoppingMode] = useState(false);
    const [editingList, setEditingList] = useState(false);

    const resetList = () => {
        if (confirm('¿Marcar todo como pendiente?')) {
            router.post(route('lists.reset', list.id), {}, { preserveScroll: true });
        }
    };

    const setStatus = (item, status) =>
        router.patch(
            route('items.update', item.id),
            { status },
            { preserveScroll: true },
        );

    const checked = items.filter((i) => i.status === 'checked').length;
    const progress = items.length ? (checked / items.length) * 100 : 0;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">
                            {list.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                            de {list.owner?.name} · tu rol:{' '}
                            {ROLE_LABELS[myRole] ?? myRole}
                            {list.recurrence_days &&
                                ` · se repite cada ${list.recurrence_days} días`}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {can.edit && (
                            <PrimaryButton
                                onClick={() => setShoppingMode(!shoppingMode)}
                            >
                                {shoppingMode
                                    ? 'Salir del modo súper'
                                    : '🛒 Modo súper'}
                            </PrimaryButton>
                        )}
                        {can.edit && !shoppingMode && (
                            <SecondaryButton
                                onClick={() => setEditingList(!editingList)}
                            >
                                ✏️ Editar
                            </SecondaryButton>
                        )}
                        {can.edit &&
                            !shoppingMode &&
                            items.some((item) => item.status !== 'pending') && (
                                <SecondaryButton onClick={resetList}>
                                    ↺ Reiniciar
                                </SecondaryButton>
                            )}
                        {can.delete && (
                            <DangerButton
                                onClick={() => {
                                    if (confirm('¿Eliminar esta lista?')) {
                                        router.delete(
                                            route('lists.destroy', list.id),
                                        );
                                    }
                                }}
                            >
                                Eliminar
                            </DangerButton>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={list.name} />

            <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
                <div>
                    <div className="mb-1 flex justify-between text-sm text-gray-600">
                        <span>
                            {checked} de {items.length} comprados
                        </span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {can.edit && !shoppingMode && editingList && (
                    <EditListForm
                        list={list}
                        onDone={() => setEditingList(false)}
                    />
                )}

                {can.edit && !shoppingMode && (
                    <AddItemForm list={list} products={products} />
                )}

                <ul className="space-y-2">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className={`flex items-center justify-between gap-3 rounded-lg p-3 shadow-sm ${STATUS_STYLES[item.status]}`}
                        >
                            <div className="min-w-0">
                                <p
                                    className={`truncate font-medium ${
                                        item.status === 'checked'
                                            ? 'text-green-800 line-through'
                                            : item.status === 'missing'
                                              ? 'text-red-800'
                                              : 'text-gray-800'
                                    }`}
                                >
                                    {item.product.name}
                                </p>
                                {can.edit && !shoppingMode ? (
                                    <div className="mt-1">
                                        <QuantityEditor item={item} />
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500">
                                        {item.quantity} {item.product.unit}
                                        {item.status === 'missing' &&
                                            ' · no había en el súper'}
                                    </p>
                                )}
                            </div>

                            {can.edit && (
                                <div className="flex shrink-0 items-center gap-2">
                                    {shoppingMode ? (
                                        <>
                                            <button
                                                onClick={() =>
                                                    setStatus(
                                                        item,
                                                        item.status ===
                                                            'checked'
                                                            ? 'pending'
                                                            : 'checked',
                                                    )
                                                }
                                                className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                                                    item.status === 'checked'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                                }`}
                                            >
                                                ✓ Lo tengo
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setStatus(
                                                        item,
                                                        item.status ===
                                                            'missing'
                                                            ? 'pending'
                                                            : 'missing',
                                                    )
                                                }
                                                className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                                                    item.status === 'missing'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                }`}
                                            >
                                                ✗ No hay
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <select
                                                className="rounded-md border-gray-300 text-xs shadow-sm"
                                                value={item.status}
                                                onChange={(e) =>
                                                    setStatus(
                                                        item,
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="pending">
                                                    Pendiente
                                                </option>
                                                <option value="checked">
                                                    Comprado
                                                </option>
                                                <option value="missing">
                                                    No había
                                                </option>
                                            </select>
                                            <button
                                                className="text-xs text-red-600 hover:underline"
                                                onClick={() =>
                                                    router.delete(
                                                        route(
                                                            'items.destroy',
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
                                        </>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                    {items.length === 0 && (
                        <li className="rounded-lg bg-white p-6 text-center text-gray-500 shadow-sm">
                            La lista está vacía.
                        </li>
                    )}
                </ul>

                {!shoppingMode &&
                    items.some((item) => item.status !== 'checked') && (
                        <div className="rounded-lg bg-white p-4 shadow">
                            <h3 className="mb-1 font-semibold text-gray-800">
                                🛍️ Carrito online
                            </h3>
                            <p className="mb-3 text-sm text-gray-500">
                                Copiá lo pendiente y pegalo en la web del súper.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <SecondaryButton onClick={() => exportCart()}>
                                    Copiar carrito
                                </SecondaryButton>
                                {onlineStores.map((store) => (
                                    <SecondaryButton
                                        key={store.id}
                                        onClick={() => exportCart(store)}
                                    >
                                        Abrir en {store.name}
                                    </SecondaryButton>
                                ))}
                            </div>
                        </div>
                    )}

                {!shoppingMode && expenses && members.length > 1 && (
                    <ExpensesSection list={list} expenses={expenses} />
                )}

                {can.share && !shoppingMode && (
                    <ShareSection
                        list={list}
                        members={members}
                        friends={friends}
                    />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
