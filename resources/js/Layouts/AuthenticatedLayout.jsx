import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';

const NAV_ITEMS = [
    { route: 'dashboard', match: 'dashboard', label: 'Inicio', emoji: '🏠' },
    { route: 'lists.index', match: 'lists.*', label: 'Listas', emoji: '📝' },
    { route: 'pantry.index', match: 'pantry.*', label: 'Despensa', emoji: '🥫' },
    {
        route: 'recommendations.index',
        match: 'recommendations.*',
        label: 'Comprar',
        emoji: '🛒',
    },
    { route: 'stores.index', match: 'stores.*', label: 'Tiendas', emoji: '🏪' },
];

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;

    return (
        <div className="min-h-screen bg-stone-100 pb-20 sm:pb-0">
            {/* Barra superior */}
            <nav className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
                    <Link
                        href={route('dashboard')}
                        className="text-lg font-extrabold tracking-tight text-emerald-700"
                    >
                        🛒 SuperLista
                    </Link>

                    {/* Nav desktop */}
                    <div className="hidden gap-1 sm:flex">
                        {NAV_ITEMS.map((item) => {
                            const active = route().current(item.match);
                            return (
                                <Link
                                    key={item.route}
                                    href={route(item.route)}
                                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                                        active
                                            ? 'bg-emerald-600 text-white'
                                            : 'text-stone-600 hover:bg-stone-100'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-bold text-emerald-800"
                            >
                                {user.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt={user.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    user.name.charAt(0).toUpperCase()
                                )}
                            </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content>
                            <div className="px-4 py-2 text-xs text-stone-500">
                                {user.email}
                            </div>
                            <Dropdown.Link href={route('profile.edit')}>
                                Mi perfil
                            </Dropdown.Link>
                            <Dropdown.Link href={route('categories.index')}>
                                Categorías
                            </Dropdown.Link>
                            <Dropdown.Link href={route('products.index')}>
                                Productos
                            </Dropdown.Link>
                            <Dropdown.Link
                                href={route('logout')}
                                method="post"
                                as="button"
                            >
                                Cerrar sesión
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </nav>

            {header && (
                <header className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
                    {header}
                </header>
            )}

            <main>{children}</main>

            {/* Tab bar inferior (mobile) */}
            <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur sm:hidden">
                <div className="flex justify-around">
                    {NAV_ITEMS.map((item) => {
                        const active = route().current(item.match);
                        return (
                            <Link
                                key={item.route}
                                href={route(item.route)}
                                className={`flex flex-col items-center gap-0.5 px-3 py-2 pb-3 text-[11px] font-medium ${
                                    active
                                        ? 'text-emerald-700'
                                        : 'text-stone-400'
                                }`}
                            >
                                <span
                                    className={`text-xl ${active ? '' : 'grayscale opacity-60'}`}
                                >
                                    {item.emoji}
                                </span>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
