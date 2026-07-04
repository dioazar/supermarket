import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Card, Loading, Picker } from '../../components/ui-kit';
import { api } from '../../lib/api';
import { colors } from '../../lib/theme';

const STATUS_META: Record<
    string,
    { label: string; dot: string; soft: string; fg: string }
> = {
    green: { label: 'Tengo', dot: '#059669', soft: colors.primarySoft, fg: colors.primaryDark },
    yellow: { label: 'Queda poco', dot: '#f59e0b', soft: colors.warningSoft, fg: colors.warning },
    red: { label: 'Me falta', dot: '#e11d48', soft: colors.dangerSoft, fg: colors.danger },
};

type HomeData = {
    pantry: {
        id: number;
        product_id: number;
        category_id: number | null;
        quantity: number;
        min_quantity: number;
        status: 'green' | 'yellow' | 'red';
        product: { id: number; name: string; unit: string };
        category: { id: number; name: string } | null;
    }[];
    stores: {
        id: number;
        name: string;
        address: string | null;
        prices: Record<string, { price: number | null; on_sale: boolean }>;
    }[];
    categories: { id: number; name: string }[];
};

export default function Home() {
    const [data, setData] = useState<HomeData | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [statuses, setStatuses] = useState<string[]>(['red', 'yellow']);
    const [storeId, setStoreId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [storePickerOpen, setStorePickerOpen] = useState(false);
    const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

    const load = useCallback(async () => {
        setData(await api<HomeData>('/home'));
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const toggleStatus = (status: string) =>
        setStatuses((current) =>
            current.includes(status)
                ? current.filter((s) => s !== status)
                : [...current, status],
        );

    const store = data?.stores.find((s) => String(s.id) === storeId);

    const { visible, unavailable, total } = useMemo(() => {
        if (!data) return { visible: [], unavailable: [], total: null };

        let items = data.pantry.filter((item) => statuses.includes(item.status));
        if (categoryId) {
            items = items.filter(
                (item) => String(item.category_id ?? '') === categoryId,
            );
        }

        if (!store) return { visible: items, unavailable: [], total: null };

        const carried = items.filter((item) => store.prices[item.product_id]);
        const missing = items.filter((item) => !store.prices[item.product_id]);
        const sum = carried.reduce((acc, item) => {
            const info = store.prices[item.product_id];
            const needed = Math.max(item.min_quantity - item.quantity, 1);
            return acc + (info.price ?? 0) * needed;
        }, 0);

        return {
            visible: carried,
            unavailable: missing,
            total: Math.round(sum * 100) / 100,
        };
    }, [data, statuses, categoryId, store]);

    if (!data) return <Loading />;

    const counts = {
        green: data.pantry.filter((i) => i.status === 'green').length,
        yellow: data.pantry.filter((i) => i.status === 'yellow').length,
        red: data.pantry.filter((i) => i.status === 'red').length,
    };

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={async () => {
                        setRefreshing(true);
                        await load();
                        setRefreshing(false);
                    }}
                />
            }
        >
            <Text style={styles.title}>¿Qué necesito?</Text>

            {/* Chips de estado */}
            <View style={styles.chipRow}>
                {(['red', 'yellow', 'green'] as const).map((status) => {
                    const meta = STATUS_META[status];
                    const active = statuses.includes(status);
                    return (
                        <Pressable
                            key={status}
                            onPress={() => toggleStatus(status)}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: active
                                        ? meta.soft
                                        : colors.card,
                                    borderColor: active
                                        ? meta.dot
                                        : colors.border,
                                },
                            ]}
                        >
                            <View
                                style={[styles.dot, { backgroundColor: meta.dot }]}
                            />
                            <Text
                                style={{
                                    color: active ? meta.fg : colors.muted,
                                    fontWeight: '600',
                                    fontSize: 13,
                                }}
                            >
                                {meta.label} ({counts[status]})
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Filtro por tienda */}
            <Picker
                label="🏪 ¿A dónde vas?"
                value={storeId}
                options={[
                    { value: '', label: 'Todas las tiendas' },
                    ...data.stores.map((s) => ({
                        value: String(s.id),
                        label: s.name,
                    })),
                ]}
                onChange={setStoreId}
                visible={storePickerOpen}
                setVisible={setStorePickerOpen}
            />

            {data.categories.length > 0 && (
                <Picker
                    label="Categoría"
                    value={categoryId}
                    options={[
                        { value: '', label: 'Todas las categorías' },
                        ...data.categories.map((category) => ({
                            value: String(category.id),
                            label: category.name,
                        })),
                    ]}
                    onChange={setCategoryId}
                    visible={categoryPickerOpen}
                    setVisible={setCategoryPickerOpen}
                />
            )}

            {/* Resultado */}
            {visible.length === 0 ? (
                <Card>
                    <Text style={{ color: colors.muted, textAlign: 'center' }}>
                        {store
                            ? `Nada que comprar en ${store.name} con estos filtros 🎉`
                            : 'Nada con estos filtros 🎉'}
                    </Text>
                </Card>
            ) : (
                <Card style={{ gap: 0, paddingVertical: 4 }}>
                    {visible.map((item, index) => {
                        const meta = STATUS_META[item.status];
                        const info = store?.prices[item.product_id];
                        return (
                            <View
                                key={item.id}
                                style={[
                                    styles.itemRow,
                                    index > 0 && {
                                        borderTopWidth: 1,
                                        borderTopColor: colors.border,
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.dot,
                                        { backgroundColor: meta.dot },
                                    ]}
                                />
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.itemName}>
                                        {item.product.name}
                                    </Text>
                                    <Text
                                        style={{
                                            color: colors.muted,
                                            fontSize: 12,
                                        }}
                                    >
                                        {meta.label} · {item.quantity}/
                                        {item.min_quantity} {item.product.unit}
                                        {item.category
                                            ? ` · ${item.category.name}`
                                            : ''}
                                    </Text>
                                </View>
                                {info && (
                                    <Text
                                        style={{
                                            fontWeight: '700',
                                            color: info.on_sale
                                                ? colors.warning
                                                : colors.text,
                                        }}
                                    >
                                        {info.price != null
                                            ? `$${info.price}`
                                            : 's/precio'}
                                        {info.on_sale ? ' 🏷️' : ''}
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                    {store && total !== null && (
                        <View
                            style={[
                                styles.itemRow,
                                {
                                    borderTopWidth: 1,
                                    borderTopColor: colors.border,
                                    justifyContent: 'space-between',
                                },
                            ]}
                        >
                            <Text style={{ color: colors.muted }}>
                                Total estimado en {store.name}
                            </Text>
                            <Text style={{ fontWeight: '800' }}>${total}</Text>
                        </View>
                    )}
                </Card>
            )}

            {store && unavailable.length > 0 && (
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                    <Text style={{ color: colors.danger, fontWeight: '700' }}>
                        {store.name} no tiene:{' '}
                    </Text>
                    {unavailable.map((item) => item.product.name).join(' · ')}
                </Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        borderWidth: 1.5,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 999,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
});
