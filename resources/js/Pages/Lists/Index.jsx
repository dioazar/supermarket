import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, useForm } from '@inertiajs/react';

const ROLE_LABELS = {
    'list-owner': 'Dueño',
    'list-editor': 'Editor',
    'list-viewer': 'Solo lectura',
};

export default function Index({ lists }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        recurrence_days: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('lists.store'), {
            onSuccess: () => reset(),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Listas de compras
                </h2>
            }
        >
            <Head title="Listas" />

            <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
                <form
                    onSubmit={submit}
                    className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow"
                >
                    <div className="grow">
                        <label className="text-sm font-medium text-gray-700">
                            Nueva lista
                        </label>
                        <TextInput
                            className="mt-1 block w-full"
                            placeholder="Ej: Compra semanal"
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
                            placeholder="opcional"
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
                    <PrimaryButton disabled={processing}>Crear</PrimaryButton>
                </form>

                <div className="overflow-hidden rounded-lg bg-white shadow">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Lista</th>
                                <th className="px-4 py-3">Dueño</th>
                                <th className="px-4 py-3">Mi rol</th>
                                <th className="px-4 py-3">Progreso</th>
                                <th className="px-4 py-3">Recurrencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lists.map((list) => (
                                <tr key={list.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <Link
                                            href={route('lists.show', list.id)}
                                            className="font-medium text-emerald-700 hover:underline"
                                        >
                                            {list.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {list.owner?.name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                                            {ROLE_LABELS[list.my_role] ??
                                                list.my_role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {list.checked_count}/{list.items_count}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {list.recurrence_days
                                            ? `cada ${list.recurrence_days} días`
                                            : '—'}
                                    </td>
                                </tr>
                            ))}
                            {lists.length === 0 && (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-4 py-6 text-center text-gray-500"
                                    >
                                        Sin listas todavía. Creá una arriba.
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
