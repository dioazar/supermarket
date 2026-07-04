import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Input,
    Loading,
    Picker,
} from '../../components/ui-kit';
import { api } from '../../lib/api';
import { colors } from '../../lib/theme';

type PantryItem = {
    id: number;
    quantity: number;
    min_quantity: number;
    status: 'green' | 'yellow' | 'red';
    category_id: number | null;
    category: { id: number; name: string } | null;
    product: { id: number; name: string; unit: string };
};

type Category = { id: number; name: string };

const STATUS_META = {
    green: { label: 'Tengo', dot: '#059669', soft: colors.primarySoft, fg: colors.primaryDark },
    yellow: { label: 'Queda poco', dot: '#f59e0b', soft: colors.warningSoft, fg: colors.warning },
    red: { label: 'Me falta', dot: '#e11d48', soft: colors.dangerSoft, fg: colors.danger },
} as const;

export default function Pantry() {
    const [items, setItems] = useState<PantryItem[] | null>(null);
    const [products, setProducts] = useState<{ id: number; name: string; unit: string }[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [adding, setAdding] = useState(false);
    const [productId, setProductId] = useState('');
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [minQuantity, setMinQuantity] = useState('1');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');

    const load = useCallback(async () => {
        const [pantry, allProducts, allCategories] = await Promise.all([
            api<PantryItem[]>('/pantry'),
            api<typeof products>('/products'),
            api<Category[]>('/categories'),
        ]);
        setItems(pantry);
        setProducts(allProducts);
        setCategories(allCategories);
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const save = async () => {
        await api('/pantry', {
            method: 'POST',
            body: {
                product_id: productId ? Number(productId) : null,
                product_name: productId ? null : productName.trim() || null,
                quantity: Number(quantity) || 0,
                min_quantity: Number(minQuantity) || 1,
                category_id:
                    categoryId && categoryId !== '__new__'
                        ? Number(categoryId)
                        : null,
                category_name:
                    categoryId === '__new__' ? newCategory.trim() || null : null,
            },
        });
        setProductId('');
        setProductName('');
        setQuantity('1');
        setMinQuantity('1');
        setCategoryId('');
        setNewCategory('');
        setAdding(false);
        load();
    };

    const adjust = async (item: PantryItem, delta: number) => {
        const next = Math.max(0, item.quantity + delta);
        setItems((current) =>
            current?.map((i) => (i.id === item.id ? { ...i, quantity: next } : i)) ?? null,
        );
        try {
            await api(`/pantry/${item.id}`, {
                method: 'PATCH',
                body: { quantity: next },
            });
        } catch {
            load();
        }
    };

    if (items === null) return <Loading />;

    return (
        <FlatList
            data={items.filter(
                (item) => !statusFilter || item.status === statusFilter,
            )}
            keyExtractor={(item) => String(item.id)}
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
            ListHeaderComponent={
                <View style={{ gap: 12, marginBottom: 12 }}>
                    {adding ? (
                        <Card style={{ gap: 10 }}>
                            <Picker
                                label="Producto"
                                value={productId}
                                options={[
                                    { value: '', label: '— producto nuevo —' },
                                    ...products.map((product) => ({
                                        value: String(product.id),
                                        label: `${product.name} (${product.unit})`,
                                    })),
                                ]}
                                onChange={setProductId}
                                visible={pickerOpen}
                                setVisible={setPickerOpen}
                            />
                            {!productId && (
                                <Input
                                    label="Nombre nuevo"
                                    value={productName}
                                    onChangeText={setProductName}
                                />
                            )}
                            <Input
                                label="Cuánto tengo"
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="decimal-pad"
                            />
                            <Input
                                label="Mínimo antes de reponer"
                                value={minQuantity}
                                onChangeText={setMinQuantity}
                                keyboardType="decimal-pad"
                            />
                            <Picker
                                label="Categoría"
                                value={categoryId}
                                options={[
                                    { value: '', label: '— sin categoría —' },
                                    ...categories.map((category) => ({
                                        value: String(category.id),
                                        label: category.name,
                                    })),
                                    { value: '__new__', label: '+ Nueva categoría…' },
                                ]}
                                onChange={setCategoryId}
                                visible={categoryPickerOpen}
                                setVisible={setCategoryPickerOpen}
                            />
                            {categoryId === '__new__' && (
                                <Input
                                    label="Nombre de la categoría"
                                    placeholder="Ej: Limpieza"
                                    value={newCategory}
                                    onChangeText={setNewCategory}
                                />
                            )}
                            <Button title="Guardar" onPress={save} />
                            <Button
                                title="Cancelar"
                                variant="secondary"
                                onPress={() => setAdding(false)}
                            />
                        </Card>
                    ) : (
                        <Button
                            title="+ Agregar a la despensa"
                            onPress={() => setAdding(true)}
                        />
                    )}

                    <View style={styles.chipRow}>
                        {(['red', 'yellow', 'green'] as const).map((status) => {
                            const meta = STATUS_META[status];
                            const active = statusFilter === status;
                            return (
                                <Pressable
                                    key={status}
                                    onPress={() =>
                                        setStatusFilter(active ? '' : status)
                                    }
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
                                        style={[
                                            styles.chipDot,
                                            { backgroundColor: meta.dot },
                                        ]}
                                    />
                                    <Text
                                        style={{
                                            color: active
                                                ? meta.fg
                                                : colors.muted,
                                            fontWeight: '600',
                                            fontSize: 13,
                                        }}
                                    >
                                        {meta.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            }
            ListEmptyComponent={<EmptyState text="Tu despensa está vacía." />}
            renderItem={({ item }) => {
                const meta = STATUS_META[item.status];
                return (
                    <Card
                        style={{
                            marginBottom: 8,
                            backgroundColor:
                                item.status === 'green' ? colors.card : meta.soft,
                        }}
                    >
                        <View style={styles.row}>
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.name}>{item.product.name}</Text>
                                <Text style={{ color: colors.muted, fontSize: 12 }}>
                                    mínimo {item.min_quantity} {item.product.unit}
                                    {item.category
                                        ? ` · ${item.category.name}`
                                        : ''}
                                </Text>
                                <View
                                    style={{
                                        marginTop: 4,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 5,
                                    }}
                                >
                                    <View
                                        style={[
                                            styles.chipDot,
                                            { backgroundColor: meta.dot },
                                        ]}
                                    />
                                    <Text
                                        style={{
                                            color: meta.fg,
                                            fontSize: 12,
                                            fontWeight: '700',
                                        }}
                                    >
                                        {meta.label}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.stepper}>
                                <Pressable
                                    style={styles.stepButton}
                                    onPress={() => adjust(item, -1)}
                                >
                                    <Text style={styles.stepText}>−</Text>
                                </Pressable>
                                <Text style={styles.qty}>{item.quantity}</Text>
                                <Pressable
                                    style={styles.stepButton}
                                    onPress={() => adjust(item, 1)}
                                >
                                    <Text style={styles.stepText}>+</Text>
                                </Pressable>
                            </View>
                        </View>
                    </Card>
                );
            }}
        />
    );
}

const styles = StyleSheet.create({
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
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
    chipDot: {
        width: 9,
        height: 9,
        borderRadius: 999,
    },
    container: {
        padding: 16,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    stepButton: {
        width: 44,
        height: 44,
        borderRadius: 999,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
    },
    qty: {
        fontSize: 17,
        fontWeight: '700',
        minWidth: 34,
        textAlign: 'center',
    },
});
