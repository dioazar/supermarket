import { Fragment } from 'react';

const UNCATEGORIZED_KEY = 'root:none';

/**
 * Convierte una lista plana de ítems en filas agrupadas por categoría raíz →
 * subcategoría, respetando qué secciones están colapsadas (mismo criterio que
 * la app móvil). Si ningún ítem tiene categoría, devuelve los ítems sin
 * encabezados.
 */
export function buildCategoryRows({
    items,
    categories,
    categoryIdOf,
    nameOf,
    keyOf,
    collapsed,
    expandAll = false,
}) {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const byName = (a, b) => a.localeCompare(b, 'es');
    const sorted = [...items].sort((a, b) => byName(nameOf(a), nameOf(b)));

    const groups = new Map();

    for (const item of sorted) {
        const category = byId.get(categoryIdOf(item) ?? -1) ?? null;
        const root = category?.parent_id
            ? (byId.get(category.parent_id) ?? null)
            : category;
        const rootKey = root ? `root:${root.id}` : UNCATEGORIZED_KEY;

        let group = groups.get(rootKey);
        if (!group) {
            group = { root, direct: [], subs: new Map() };
            groups.set(rootKey, group);
        }

        if (category && category.parent_id) {
            const sub = group.subs.get(category.id) ?? [];
            sub.push(item);
            group.subs.set(category.id, sub);
        } else {
            group.direct.push(item);
        }
    }

    // Sin categorías asignadas: lista plana, sin encabezados.
    if (groups.size === 1 && groups.has(UNCATEGORIZED_KEY)) {
        return sorted.map((item) => ({
            type: 'item',
            key: String(keyOf(item)),
            item,
        }));
    }

    const orderedGroups = [...groups.entries()].sort(([keyA, a], [keyB, b]) => {
        if (keyA === UNCATEGORIZED_KEY) return 1;
        if (keyB === UNCATEGORIZED_KEY) return -1;
        return byName(a.root.name, b.root.name);
    });

    const isOpen = (key) => expandAll || !collapsed.has(key);
    const rows = [];

    for (const [rootKey, group] of orderedGroups) {
        const subCount = [...group.subs.values()].reduce(
            (total, subItems) => total + subItems.length,
            0,
        );
        rows.push({
            type: 'root',
            key: rootKey,
            name: group.root?.name ?? 'Sin categoría',
            count: group.direct.length + subCount,
        });
        if (!isOpen(rootKey)) continue;

        for (const item of group.direct) {
            rows.push({ type: 'item', key: String(keyOf(item)), item });
        }

        const orderedSubs = [...group.subs.entries()].sort(([idA], [idB]) =>
            byName(byId.get(idA).name, byId.get(idB).name),
        );
        for (const [subId, subItems] of orderedSubs) {
            const subKey = `sub:${subId}`;
            rows.push({
                type: 'sub',
                key: subKey,
                name: byId.get(subId).name,
                count: subItems.length,
            });
            if (!isOpen(subKey)) continue;
            for (const item of subItems) {
                rows.push({ type: 'item', key: String(keyOf(item)), item });
            }
        }
    }

    return rows;
}

/** Alterna una sección dentro del set de colapsadas (inmutable, para useState). */
export function toggleSection(collapsed, key) {
    const next = new Set(collapsed);
    if (next.has(key)) {
        next.delete(key);
    } else {
        next.add(key);
    }
    return next;
}

/**
 * Contenido clickeable de un encabezado de sección (chevron + nombre + conteo).
 * Cada página lo envuelve en lo que necesite (li, td, etc.).
 */
export function CategoryHeaderButton({ name, count, level, collapsed, onToggle }) {
    const root = level === 'root';
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`flex w-full items-center gap-2 text-left ${root ? '' : 'pl-5'}`}
        >
            <span
                className={`w-3 text-xs ${root ? 'text-emerald-700' : 'text-stone-400'}`}
            >
                {collapsed ? '▸' : '▾'}
            </span>
            <span
                className={
                    root
                        ? 'text-sm font-extrabold text-stone-800'
                        : 'text-xs font-bold text-stone-500'
                }
            >
                {name}
            </span>
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-bold text-stone-500">
                {count}
            </span>
        </button>
    );
}

/** Select de categorías con subcategorías indentadas (raíz → ↳ hijas). */
export function CategorySelect({
    categories,
    value,
    onChange,
    emptyLabel = '— sin categoría —',
    extraOptions = [],
    className = 'mt-1 block rounded-md border-gray-300 text-sm shadow-sm',
}) {
    const roots = categories
        .filter((category) => !category.parent_id)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return (
        <select
            className={className}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            {emptyLabel !== null && <option value="">{emptyLabel}</option>}
            {roots.map((parent) => (
                <Fragment key={parent.id}>
                    <option value={parent.id}>{parent.name}</option>
                    {categories
                        .filter((c) => c.parent_id === parent.id)
                        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                        .map((child) => (
                            <option key={child.id} value={child.id}>
                                {'  ↳ '}
                                {child.name}
                            </option>
                        ))}
                </Fragment>
            ))}
            {extraOptions.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
