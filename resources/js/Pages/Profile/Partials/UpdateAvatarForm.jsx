import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function UpdateAvatarForm({ className = '' }) {
    const user = usePage().props.auth.user;
    const [uploading, setUploading] = useState(false);

    const upload = (file) => {
        if (!file) return;
        setUploading(true);
        router.post(
            route('profile.avatar'),
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setUploading(false),
            },
        );
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">
                    Foto de perfil
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                    Se achica automáticamente para que cargue rápido.
                </p>
            </header>

            <div className="mt-4 flex items-center gap-4">
                {user.avatar_url ? (
                    <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="h-20 w-20 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-800">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <label className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                    {uploading
                        ? 'Subiendo…'
                        : user.avatar_url
                          ? 'Cambiar foto'
                          : 'Subir foto'}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => upload(e.target.files[0])}
                    />
                </label>
            </div>
        </section>
    );
}
