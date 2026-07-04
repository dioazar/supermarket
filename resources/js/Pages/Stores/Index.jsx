import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function formatDistance(km) {
    if (km === null || km === undefined) return null;
    return km < 1 ? `a ${Math.round(km * 1000)} m` : `a ${km.toFixed(1)} km`;
}

function NearbySection({ existingNames }) {
    const [places, setPlaces] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const search = () => {
        if (!navigator.geolocation) {
            setError('Tu navegador no soporta geolocalización.');
            return;
        }
        setBusy(true);
        setError('');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const response = await fetch(
                        route('stores.nearby') +
                            `?lat=${position.coords.latitude}&lng=${position.coords.longitude}`,
                        { headers: { Accept: 'application/json' } },
                    );
                    const data = await response.json();
                    setPlaces(data.places);
                } catch {
                    setError('No se pudieron buscar supermercados.');
                } finally {
                    setBusy(false);
                }
            },
            () => {
                setBusy(false);
                setError('No pudimos obtener tu ubicación. Revisá los permisos.');
            },
            { timeout: 8000 },
        );
    };

    const add = (place) => {
        router.post(
            route('stores.store'),
            {
                name: place.name,
                address: place.address,
                lat: place.lat,
                lng: place.lng,
            },
            { preserveScroll: true },
        );
    };

    return (
        <div className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-gray-800">
                        🔍 Supermercados cerca tuyo
                    </h3>
                    <p className="text-sm text-gray-500">
                        Busca en el mapa los súper a menos de 1,5 km y agregalos
                        con un click.
                    </p>
                </div>
                <PrimaryButton onClick={search} disabled={busy}>
                    {busy ? 'Buscando…' : places ? 'Buscar de nuevo' : 'Buscar'}
                </PrimaryButton>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {places && places.length === 0 && (
                <p className="mt-3 text-sm text-gray-500">
                    No encontramos supermercados cerca. Probá desde otra
                    ubicación.
                </p>
            )}
            {places && places.length > 0 && (
                <ul className="mt-3 max-h-80 divide-y divide-gray-100 overflow-y-auto">
                    {places.map((place) => {
                        const added = existingNames.includes(place.name);
                        return (
                            <li
                                key={`${place.source}-${place.external_id}`}
                                className="flex items-center justify-between gap-3 py-2"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-gray-800">
                                        {place.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {[
                                            place.address,
                                            formatDistance(place.distance_km),
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                </div>
                                {added ? (
                                    <span className="shrink-0 text-xs font-medium text-emerald-600">
                                        Agregada ✓
                                    </span>
                                ) : (
                                    <SecondaryButton onClick={() => add(place)}>
                                        + Agregar
                                    </SecondaryButton>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function AddProductForm({ store, products }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        product_id: '',
        product_name: '',
        price: '',
        sale_price: '',
        sale_ends_at: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('stores.products.attach', store.id), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
            <select
                className="rounded-md border-gray-300 text-sm shadow-sm"
                value={data.product_id}
                onChange={(e) => setData('product_id', e.target.value)}
            >
                <option value="">— producto nuevo —</option>
                {products.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                ))}
            </select>
            {!data.product_id && (
                <TextInput
                    className="block"
                    placeholder="Nombre nuevo"
                    value={data.product_name}
                    onChange={(e) => setData('product_name', e.target.value)}
                />
            )}
            <TextInput
                type="number"
                step="0.01"
                min="0"
                className="block w-28"
                placeholder="Precio"
                value={data.price}
                onChange={(e) => setData('price', e.target.value)}
            />
            <TextInput
                type="number"
                step="0.01"
                min="0"
                className="block w-28"
                placeholder="Oferta $"
                value={data.sale_price}
                onChange={(e) => setData('sale_price', e.target.value)}
            />
            {data.sale_price !== '' && (
                <TextInput
                    type="date"
                    className="block"
                    title="La oferta vence el…"
                    value={data.sale_ends_at}
                    onChange={(e) => setData('sale_ends_at', e.target.value)}
                />
            )}
            <SecondaryButton type="submit" disabled={processing}>
                Agregar
            </SecondaryButton>
            <InputError
                message={
                    errors.product_id || errors.product_name || errors.price
                }
            />
        </form>
    );
}

export default function Index({ stores, products }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        address: '',
        website: '',
        lat: null,
        lng: null,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('stores.store'), { onSuccess: () => reset() });
    };

    const captureLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((position) => {
            setData((current) => ({
                ...current,
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            }));
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Mis tiendas
                </h2>
            }
        >
            <Head title="Tiendas" />

            <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
                <form
                    onSubmit={submit}
                    className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow"
                >
                    <div className="grow">
                        <label className="text-sm font-medium text-gray-700">
                            Nueva tienda
                        </label>
                        <TextInput
                            className="mt-1 block w-full"
                            placeholder="Ej: Carrefour"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>
                    <div className="grow">
                        <label className="text-sm font-medium text-gray-700">
                            Dirección (opcional)
                        </label>
                        <TextInput
                            className="mt-1 block w-full"
                            value={data.address}
                            onChange={(e) =>
                                setData('address', e.target.value)
                            }
                        />
                    </div>
                    <div className="grow">
                        <label className="text-sm font-medium text-gray-700">
                            Sitio web (opcional)
                        </label>
                        <TextInput
                            className="mt-1 block w-full"
                            placeholder="https://..."
                            value={data.website}
                            onChange={(e) =>
                                setData('website', e.target.value)
                            }
                        />
                        <InputError message={errors.website} className="mt-1" />
                    </div>
                    <SecondaryButton type="button" onClick={captureLocation}>
                        {data.lat ? '📍 Ubicación ✓' : '📍 Estoy acá'}
                    </SecondaryButton>
                    <PrimaryButton disabled={processing}>Crear</PrimaryButton>
                </form>

                <NearbySection existingNames={stores.map((s) => s.name)} />

                {stores.map((store) => (
                    <div
                        key={store.id}
                        className="rounded-lg bg-white p-4 shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-800">
                                    {store.name}
                                </h3>
                                {store.address && (
                                    <p className="text-sm text-gray-500">
                                        {store.address}
                                    </p>
                                )}
                            </div>
                            <button
                                className="text-xs text-red-600 hover:underline"
                                onClick={() => {
                                    if (confirm('¿Eliminar esta tienda?')) {
                                        router.delete(
                                            route('stores.destroy', store.id),
                                            { preserveScroll: true },
                                        );
                                    }
                                }}
                            >
                                Eliminar tienda
                            </button>
                        </div>

                        <table className="mt-3 min-w-full divide-y divide-gray-200 text-sm">
                            <tbody className="divide-y divide-gray-100">
                                {store.products.map((product) => (
                                    <tr key={product.id}>
                                        <td className="py-2 pr-4 text-gray-800">
                                            {product.name}
                                        </td>
                                        <td className="py-2 pr-4 text-gray-600">
                                            {product.pivot.sale_price != null ? (
                                                <>
                                                    <span className="mr-1 text-gray-400 line-through">
                                                        ${product.pivot.price}
                                                    </span>
                                                    <span className="font-semibold text-amber-600">
                                                        ${product.pivot.sale_price} 🏷️
                                                    </span>
                                                </>
                                            ) : product.pivot.price != null ? (
                                                `$${product.pivot.price}`
                                            ) : (
                                                'sin precio'
                                            )}
                                        </td>
                                        <td className="py-2 text-right">
                                            <button
                                                className="text-xs text-red-600 hover:underline"
                                                onClick={() =>
                                                    router.delete(
                                                        route(
                                                            'stores.products.detach',
                                                            [
                                                                store.id,
                                                                product.id,
                                                            ],
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
                                ))}
                                {store.products.length === 0 && (
                                    <tr>
                                        <td className="py-2 text-gray-500">
                                            Sin productos cargados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <AddProductForm store={store} products={products} />
                    </div>
                ))}

                {stores.length === 0 && (
                    <p className="text-center text-gray-500">
                        Agregá tiendas para poder recibir recomendaciones de
                        dónde comprar.
                    </p>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
