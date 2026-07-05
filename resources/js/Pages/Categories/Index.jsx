import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function Thumb({ url, fallback }) {
    return url ? (
        <img
            src={url}
            alt=""
            className="h-10 w-10 rounded-lg object-cover"
            loading="lazy"
        />
    ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-lg">
            {fallback}
        </div>
    );
}

function CategoryRow({ category, nested = false, onUpload, onAddSub }) {
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState(category.name);

    const saveName = (e) => {
        e.preventDefault();
        router.patch(
            route('categories.update', category.id),
            { name },
            {
                preserveScroll: true,
                onSuccess: () => setRenaming(false),
            },
        );
    };

    return (
        <li
            className={`flex items-center justify-between gap-3 py-3 pr-4 ${
                nested ? 'pl-12' : 'pl-4'
            }`}
        >
            <div className="flex min-w-0 grow items-center gap-3">
                {nested && <span className="text-stone-400">↳</span>}
                <Thumb url={category.image_url} fallback="🏷️" />
                {renaming ? (
                    <form onSubmit={saveName} className="flex grow gap-2">
                        <TextInput
                            className="block w-full text-sm"
                            value={name}
                            autoFocus
                            onChange={(e) => setName(e.target.value)}
                        />
                        <PrimaryButton>OK</PrimaryButton>
                    </form>
                ) : (
                    <div>
                        <p className="font-medium text-stone-800">
                            {category.name}
                        </p>
                        <p className="text-xs text-stone-500">
                            {category.pantry_items_count} productos en despensa
                        </p>
                    </div>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
                {!nested && (
                    <button
                        className="text-xs font-medium text-emerald-600 hover:underline"
                        onClick={() => onAddSub(category)}
                    >
                        + Sub
                    </button>
                )}
                <button
                    className="text-xs font-medium text-emerald-600 hover:underline"
                    onClick={() => {
                        setName(category.name);
                        setRenaming(!renaming);
                    }}
                >
                    {renaming ? 'Cancelar' : 'Renombrar'}
                </button>
                <label className="cursor-pointer text-xs font-medium text-emerald-600 hover:underline">
                    {category.image_url ? 'Cambiar foto' : 'Subir foto'}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onUpload(category, e.target.files[0])}
                    />
                </label>
                <button
                    className="text-xs text-rose-600 hover:underline"
                    onClick={() => {
                        if (confirm(`¿Eliminar "${category.name}"?`)) {
                            router.delete(
                                route('categories.destroy', category.id),
                                { preserveScroll: true },
                            );
                        }
                    }}
                >
                    Eliminar
                </button>
            </div>
        </li>
    );
}

export default function Index({ categories }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        parent_id: '',
        image: null,
    });

    const roots = categories.filter((category) => !category.parent_id);
    const childrenOf = (parent) =>
        categories.filter((category) => category.parent_id === parent.id);

    // Atajo "+ Sub": deja el formulario de arriba listo con el padre elegido.
    const addSub = (parent) => {
        setData('parent_id', String(parent.id));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.querySelector('input[placeholder="Ej: Limpieza"]')?.focus();
    };

    const submit = (e) => {
        e.preventDefault();
        post(route('categories.store'), {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    };

    const uploadImage = (category, file) => {
        if (!file) return;
        router.post(
            route('categories.image', category.id),
            { image: file },
            { forceFormData: true, preserveScroll: true },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-bold text-stone-800">
                    Mis categorías
                </h2>
            }
        >
            <Head title="Categorías" />

            <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
                <form
                    onSubmit={submit}
                    className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm"
                >
                    <div className="grow">
                        <label className="text-sm font-medium text-gray-700">
                            Nueva categoría
                        </label>
                        <TextInput
                            className="mt-1 block w-full"
                            placeholder="Ej: Limpieza"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        <InputError message={errors.name} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Dentro de (opcional)
                        </label>
                        <select
                            className="mt-1 block rounded-md border-gray-300 text-sm shadow-sm"
                            value={data.parent_id}
                            onChange={(e) =>
                                setData('parent_id', e.target.value)
                            }
                        >
                            <option value="">— ninguna (raíz) —</option>
                            {roots.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.parent_id}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">
                            Foto/ícono
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            className="mt-1 block w-52 text-xs text-stone-500 file:mr-2 file:rounded-full file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-emerald-700"
                            onChange={(e) =>
                                setData('image', e.target.files[0] ?? null)
                            }
                        />
                        <InputError message={errors.image} className="mt-1" />
                    </div>
                    <PrimaryButton disabled={processing}>Crear</PrimaryButton>
                </form>

                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <ul className="divide-y divide-stone-100">
                        {roots.flatMap((root) => [
                            <CategoryRow
                                key={root.id}
                                category={root}
                                onUpload={uploadImage}
                                onAddSub={addSub}
                            />,
                            ...childrenOf(root).map((child) => (
                                <CategoryRow
                                    key={child.id}
                                    category={child}
                                    nested
                                    onUpload={uploadImage}
                                    onAddSub={addSub}
                                />
                            )),
                        ])}
                        {categories.length === 0 && (
                            <li className="px-4 py-6 text-center text-sm text-stone-500">
                                Sin categorías todavía. Creá la primera arriba.
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
