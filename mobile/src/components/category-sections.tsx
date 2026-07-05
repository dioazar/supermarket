import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export type CategoryRef = { id: number; name: string; parent_id: number | null };

export type CategoryRow<T> =
    | { type: 'root'; key: string; name: string; count: number }
    | { type: 'sub'; key: string; name: string; count: number }
    | { type: 'item'; key: string; item: T };

const UNCATEGORIZED_KEY = 'root:none';

/**
 * Convierte una lista plana de ítems en filas para FlatList agrupadas por
 * categoría raíz → subcategoría, respetando qué secciones están colapsadas.
 * Si ningún ítem tiene categoría, devuelve los ítems sin encabezados.
 */
export function buildCategoryRows<T>(opts: {
    items: T[];
    categories: CategoryRef[];
    categoryIdOf: (item: T) => number | null;
    nameOf: (item: T) => string;
    keyOf: (item: T) => string | number;
    collapsed: Set<string>;
    expandAll?: boolean;
}): CategoryRow<T>[] {
    const { items, categories, categoryIdOf, nameOf, keyOf, collapsed, expandAll } = opts;
    const byId = new Map(categories.map((category) => [category.id, category]));
    const byName = (a: string, b: string) => a.localeCompare(b, 'es');
    const sorted = [...items].sort((a, b) => byName(nameOf(a), nameOf(b)));

    type Group = { root: CategoryRef | null; direct: T[]; subs: Map<number, T[]> };
    const groups = new Map<string, Group>();

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
        return byName(a.root!.name, b.root!.name);
    });

    const isOpen = (key: string) => expandAll || !collapsed.has(key);
    const rows: CategoryRow<T>[] = [];

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
            byName(byId.get(idA)!.name, byId.get(idB)!.name),
        );
        for (const [subId, subItems] of orderedSubs) {
            const subKey = `sub:${subId}`;
            rows.push({
                type: 'sub',
                key: subKey,
                name: byId.get(subId)!.name,
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
export function toggleSection(collapsed: Set<string>, key: string): Set<string> {
    const next = new Set(collapsed);
    if (next.has(key)) {
        next.delete(key);
    } else {
        next.add(key);
    }
    return next;
}

/** Opciones de Picker anidadas (raíces con sus subcategorías indentadas). */
export function categoryOptions(categories: CategoryRef[]) {
    return categories
        .filter((category) => !category.parent_id)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .flatMap((parent) => [
            { value: String(parent.id), label: parent.name },
            ...categories
                .filter((category) => category.parent_id === parent.id)
                .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                .map((child) => ({
                    value: String(child.id),
                    label: `  ↳ ${child.name}`,
                })),
        ]);
}

export function CategoryHeader({
    name,
    count,
    level,
    collapsed,
    onToggle,
}: {
    name: string;
    count: number;
    level: 'root' | 'sub';
    collapsed: boolean;
    onToggle: () => void;
}) {
    const root = level === 'root';
    return (
        <Pressable
            onPress={onToggle}
            hitSlop={4}
            style={[styles.header, root ? styles.rootHeader : styles.subHeader]}
        >
            <Text style={[styles.chevron, !root && styles.subChevron]}>
                {collapsed ? '▸' : '▾'}
            </Text>
            <Text
                style={[styles.title, !root && styles.subTitle]}
                numberOfLines={1}
            >
                {name}
            </Text>
            <View style={styles.countPill}>
                <Text style={styles.countText}>{count}</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    rootHeader: {
        marginTop: 8,
    },
    subHeader: {
        marginLeft: 14,
    },
    chevron: {
        fontSize: 13,
        color: colors.primaryDark,
        width: 14,
        textAlign: 'center',
    },
    subChevron: {
        color: colors.muted,
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
        flexShrink: 1,
    },
    subTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.muted,
    },
    countPill: {
        backgroundColor: colors.border,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 1,
    },
    countText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.muted,
    },
});
