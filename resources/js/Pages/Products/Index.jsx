import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    buildCategoryRows,
    CategoryHeaderButton,
    CategorySelect,
    toggleSection,
} from '@/Components/CategorySections';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function EditProductForm({ product, categories, onDone }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: product.name,
        unit: product.unit,
        category_id: product.category_id ?? '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('products.update', product.id), {
            preserveScroll: true,
            onSuccess: onDone,
        });
    };

    return (
        <form
            onSubmit={submit}
            className="flex flex-wrap items-end gap-3 px-4 py-3"
        >
            <div className="grow">
                <label className="text-sm font-medium text-gray-700">
                    Nombre
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
                    Unidad
                </label>
                <TextInput
                    className="mt-1 block w-20"
                    value={data.unit}
                    onChange={(e) => setData('unit', e.target.value)}
                />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-700">
                    Categoría
                </label>
                <CategorySelect
                    categories={categories}
                    value={data.category_id}
                    onChange={(value) => setData('category_id', value)}
                />
            </div>
            <PrimaryButton disabled={processing}>Guardar</PrimaryButton>
            <SecondaryButton type="button" onClick={onDone}>
                Cancelar
            </SecondaryButton>
        </form>
    );
}

export default function Index({ products, categories = [] }) {
    const [query, setQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [collapsed, setCollapsed] = useState(new Set());
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        unit: 'un',
        category_id: '',
        image: null,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('products.store'), {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    };

    const uploadImage = (product, file) => {
        if (!file) return;
        router.post(
            route('products.image', product.id),
            { image: file },
            { forceFormData: true, preserveScroll: true },
        );
    };

    const visible = products.filter((product) =>
        product.name.toLowerCase().includes(query.toLowerCase()),
    );

    // Con búsqueda activa se muestran todas las coincidencias, aun colapsadas.
    const rows = buildCategoryRows({
        items: visible,
        categories,
        categoryIdOf: (product) => product.category_id,
        nameOf: (product) => product.name,
        keyOf: (product) => product.id,
        collapsed,
        expandAll: query.trim() !== '',
    });

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-bold text-stone-800">Productos</h2>
            }
        >
            <Head title="Productos" />

            <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
                <form
                    onSubmit={submit}
                    className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm"
                >
                    <div className="grow">
                        <label className="text-sm font-medium text-gray-700">
                            Nuevo producto
                        </label>
                        <TextInput
                            className="mt-1 block w-full"
                            placeholder="Ej: Café molido"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Unidad
                        </label>
                        <TextInput
                            className="mt-1 block w-20"
                            value={data.unit}
                            onChange={(e) => setData('unit', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Categoría
                        </label>
                        <CategorySelect
                            categories={categories}
                            value={data.category_id}
                            onChange={(value) => setData('category_id', value)}
                        />
                        <InputError
                            message={errors.category_id}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Foto
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            className="mt-1 block w-48 text-xs text-stone-500 file:mr-2 file:rounded-full file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-emerald-700"
                            onChange={(e) =>
                                setData('image', e.target.files[0] ?? null)
                            }
                        />
                    </div>
                    <PrimaryButton disabled={processing}>Crear</PrimaryButton>
                </form>

                <TextInput
                    className="block w-full"
                    placeholder="🔍 Buscar producto…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <ul className="divide-y divide-stone-100">
                        {rows.map((row) => {
                            if (row.type !== 'item') {
                                return (
                                    <li
                                        key={row.key}
                                        className="bg-stone-50 px-4 py-2"
                                    >
                                        <CategoryHeaderButton
                                            name={row.name}
                                            count={row.count}
                                            level={row.type}
                                            collapsed={collapsed.has(row.key)}
                                            onToggle={() =>
                                                setCollapsed((current) =>
                                                    toggleSection(
                                                        current,
                                                        row.key,
                                                    ),
                                                )
                                            }
                                        />
                                    </li>
                                );
                            }
                            const product = row.item;
                            return editingId === product.id ? (
                                <li key={row.key}>
                                    <EditProductForm
                                        product={product}
                                        categories={categories}
                                        onDone={() => setEditingId(null)}
                                    />
                                </li>
                            ) : (
                                <li
                                    key={row.key}
                                    className="flex items-center justify-between gap-3 px-4 py-3"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        {product.image_url ? (
                                            <img
                                                src={product.image_url}
                                                alt=""
                                                loading="lazy"
                                                className="h-10 w-10 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-lg">
                                                🛒
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-stone-800">
                                                {product.name}
                                            </p>
                                            <p className="text-xs text-stone-500">
                                                {product.unit}
                                                {product.category &&
                                                    ` · ${product.category.name}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <button
                                            className="text-xs font-medium text-emerald-600 hover:underline"
                                            onClick={() =>
                                                setEditingId(product.id)
                                            }
                                        >
                                            Editar
                                        </button>
                                        <label className="cursor-pointer text-xs font-medium text-emerald-600 hover:underline">
                                            {product.image_url
                                                ? 'Cambiar foto'
                                                : 'Subir foto'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) =>
                                                    uploadImage(
                                                        product,
                                                        e.target.files[0],
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                </li>
                            );
                        })}
                        {visible.length === 0 && (
                            <li className="px-4 py-6 text-center text-sm text-stone-500">
                                No hay productos que coincidan.
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
