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

function ShareSection({ list, members }) {
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
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                                {ROLE_LABELS[member.role] ?? member.role}
                            </span>
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
                                <p className="text-xs text-gray-500">
                                    {item.quantity} {item.product.unit}
                                    {item.status === 'missing' &&
                                        ' · no había en el súper'}
                                </p>
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

                {can.share && !shoppingMode && (
                    <ShareSection list={list} members={members} />
                )}
            </div>
        </AuthenticatedLayout>
    );
}
