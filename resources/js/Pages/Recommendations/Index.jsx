import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

function formatDistance(km) {
    if (km === null || km === undefined) return null;
    return km < 1 ? `a ${Math.round(km * 1000)} m` : `a ${km.toFixed(1)} km`;
}

export default function Index({ missing, stores, offers }) {
    const [locating, setLocating] = useState(false);
    const hasDistances = stores.some((store) => store.distance_km !== null);

    const locate = () => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                router.get(
                    route('recommendations.index'),
                    {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    },
                    { preserveState: false, onFinish: () => setLocating(false) },
                );
            },
            () => setLocating(false),
            { timeout: 8000 },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-bold text-stone-800">
                    ¿Dónde comprar?
                </h2>
            }
        >
            <Head title="Dónde comprar" />

            <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <h3 className="mb-3 font-semibold text-stone-800">
                        Te faltan {missing.length} productos
                    </h3>
                    {missing.length === 0 ? (
                        <p className="text-sm text-stone-600">
                            ¡Nada pendiente! Tu despensa está completa y no hay
                            ítems pendientes en tus listas.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {missing.map((product) => (
                                <span
                                    key={product.id}
                                    className="rounded-full bg-rose-50 px-3 py-1 text-sm text-rose-700"
                                    title={`Origen: ${product.sources.join(' + ')}`}
                                >
                                    {product.name} · {product.needed}{' '}
                                    {product.unit}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <PrimaryButton
                    onClick={locate}
                    disabled={locating}
                    className="w-full justify-center"
                >
                    {locating
                        ? 'Buscando ubicación…'
                        : hasDistances
                          ? '📍 Actualizar mi ubicación'
                          : '📍 Ver distancias desde donde estoy'}
                </PrimaryButton>

                {offers.length > 0 && (
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <h3 className="mb-3 font-semibold text-stone-800">
                            🏷️ Ofertas activas
                        </h3>
                        <ul className="divide-y divide-stone-100">
                            {offers.map((offer, index) => (
                                <li
                                    key={index}
                                    className="flex items-center justify-between py-2"
                                >
                                    <div>
                                        <p className="font-medium text-stone-800">
                                            {offer.product}
                                        </p>
                                        <p className="text-xs text-stone-500">
                                            {offer.store}
                                            {offer.sale_ends_at &&
                                                ` · hasta el ${new Date(
                                                    offer.sale_ends_at +
                                                        'T00:00:00',
                                                ).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p>
                                            {offer.price != null && (
                                                <span className="mr-2 text-sm text-stone-400 line-through">
                                                    ${offer.price}
                                                </span>
                                            )}
                                            <span className="font-bold text-amber-600">
                                                ${offer.sale_price}
                                            </span>
                                        </p>
                                        {offer.discount_pct != null && (
                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                                -{offer.discount_pct}%
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {missing.length > 0 && stores.length === 0 && (
                    <p className="text-center text-stone-500">
                        Cargá tus{' '}
                        <Link
                            href={route('stores.index')}
                            className="text-emerald-600 hover:underline"
                        >
                            tiendas
                        </Link>{' '}
                        con productos y precios para ver recomendaciones.
                    </p>
                )}

                {missing.length > 0 &&
                    stores.map((store, index) => (
                        <div
                            key={store.id}
                            className={`rounded-2xl bg-white p-4 shadow-sm ${
                                index === 0 ? 'ring-2 ring-emerald-500' : ''
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-stone-800">
                                        {index === 0 && '⭐ '}
                                        {store.name}
                                    </h3>
                                    <p className="text-sm text-stone-500">
                                        {[
                                            store.address,
                                            formatDistance(store.distance_km),
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-stone-800">
                                        {store.covered} de {missing.length}
                                    </p>
                                    <p className="text-sm text-stone-500">
                                        aprox. ${store.total}
                                    </p>
                                    {store.offers_count > 0 && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                            {store.offers_count} en oferta
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {store.covered_products.map((product) => (
                                    <span
                                        key={product.id}
                                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                                            product.on_sale
                                                ? 'bg-amber-100 text-amber-800'
                                                : 'bg-emerald-50 text-emerald-800'
                                        }`}
                                    >
                                        {product.name}
                                        {product.price != null &&
                                            ` $${product.price}`}
                                        {product.on_sale && ' 🏷️'}
                                    </span>
                                ))}
                            </div>

                            {store.missing_products.length > 0 && (
                                <p className="mt-3 text-xs text-stone-500">
                                    <span className="font-semibold text-rose-600">
                                        Te va a faltar:
                                    </span>{' '}
                                    {store.missing_products.join(' · ')}
                                </p>
                            )}
                        </div>
                    ))}
            </div>
        </AuthenticatedLayout>
    );
}
