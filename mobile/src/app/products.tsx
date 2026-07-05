import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import {
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
    Button,
    Card,
    EmptyState,
    Input,
    Loading,
    Picker,
} from '../components/ui-kit';
import { api, ApiError, apiUpload } from '../lib/api';
import { colors } from '../lib/theme';
import {
    buildCategoryRows,
    CategoryHeader,
    categoryOptions,
    toggleSection,
} from '../components/category-sections';

type Product = {
    id: number;
    name: string;
    unit: string;
    image_url: string | null;
    category_id: number | null;
    category: { id: number; name: string } | null;
};

type Category = { id: number; name: string; parent_id: number | null };

function pickerOptions(categories: Category[]) {
    return [
        { value: '', label: '— sin categoría —' },
        ...categoryOptions(categories),
    ];
}

export default function Products() {
    const [products, setProducts] = useState<Product[] | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const [unit, setUnit] = useState('un');
    const [categoryId, setCategoryId] = useState('');
    const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
    const [error, setError] = useState('');

    // Edición inline de un producto existente.
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editUnit, setEditUnit] = useState('');
    const [editCategoryId, setEditCategoryId] = useState('');
    const [editPickerOpen, setEditPickerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    const load = useCallback(async () => {
        setProducts(await api<Product[]>('/products'));
        setCategories(await api<Category[]>('/categories'));
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    if (!products) return <Loading />;

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

    const create = async () => {
        if (!name.trim()) return;
        setError('');
        try {
            await api('/products', {
                method: 'POST',
                body: {
                    name: name.trim(),
                    unit: unit.trim() || 'un',
                    category_id: categoryId ? Number(categoryId) : null,
                },
            });
            setName('');
            setUnit('un');
            setCategoryId('');
            setCreating(false);
            load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Error');
        }
    };

    const openEdit = (product: Product) => {
        setEditingId(product.id);
        setEditName(product.name);
        setEditUnit(product.unit);
        setEditCategoryId(product.category_id ? String(product.category_id) : '');
        setError('');
    };

    const saveEdit = async () => {
        if (editingId === null) return;
        setError('');
        try {
            await api(`/products/${editingId}`, {
                method: 'PATCH',
                body: {
                    name: editName.trim(),
                    unit: editUnit.trim() || 'un',
                    category_id: editCategoryId ? Number(editCategoryId) : null,
                },
            });
            setEditingId(null);
            load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Error');
        }
    };

    const pickImage = async (product: Product) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });

        if (result.canceled || !result.assets[0]) return;

        try {
            await apiUpload(`/products/${product.id}/image`, 'image', result.assets[0]);
            load();
        } catch {
            setError('No se pudo subir la foto');
        }
    };

    return (
        <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
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
                    {creating ? (
                        <Card style={{ gap: 10 }}>
                            <Input
                                label="Nombre"
                                value={name}
                                onChangeText={setName}
                                placeholder="Ej: Café molido"
                            />
                            <Input
                                label="Unidad (kg, lt, un, paq…)"
                                value={unit}
                                onChangeText={setUnit}
                            />
                            <Picker
                                label="Categoría"
                                value={categoryId}
                                options={pickerOptions(categories)}
                                onChange={setCategoryId}
                                visible={categoryPickerOpen}
                                setVisible={setCategoryPickerOpen}
                            />
                            {error !== '' && (
                                <Text style={{ color: colors.danger }}>{error}</Text>
                            )}
                            <Button title="Crear producto" onPress={create} />
                            <Button
                                title="Cancelar"
                                variant="secondary"
                                onPress={() => setCreating(false)}
                            />
                        </Card>
                    ) : (
                        <Button
                            title="+ Nuevo producto"
                            onPress={() => setCreating(true)}
                        />
                    )}
                    <Input
                        placeholder="🔍 Buscar producto…"
                        value={query}
                        onChangeText={setQuery}
                    />
                </View>
            }
            ListEmptyComponent={<EmptyState text="No hay productos que coincidan." />}
            renderItem={({ item: row }) => {
                if (row.type !== 'item') {
                    return (
                        <CategoryHeader
                            name={row.name}
                            count={row.count}
                            level={row.type}
                            collapsed={collapsed.has(row.key)}
                            onToggle={() =>
                                setCollapsed((current) =>
                                    toggleSection(current, row.key),
                                )
                            }
                        />
                    );
                }
                const item = row.item;
                return editingId === item.id ? (
                    <Card style={{ marginBottom: 8, gap: 10 }}>
                        <Input
                            label="Nombre"
                            value={editName}
                            onChangeText={setEditName}
                        />
                        <Input
                            label="Unidad"
                            value={editUnit}
                            onChangeText={setEditUnit}
                        />
                        <Picker
                            label="Categoría"
                            value={editCategoryId}
                            options={pickerOptions(categories)}
                            onChange={setEditCategoryId}
                            visible={editPickerOpen}
                            setVisible={setEditPickerOpen}
                        />
                        {error !== '' && (
                            <Text style={{ color: colors.danger }}>{error}</Text>
                        )}
                        <Button title="Guardar" onPress={saveEdit} />
                        <Button
                            title="Cancelar"
                            variant="secondary"
                            onPress={() => setEditingId(null)}
                        />
                    </Card>
                ) : (
                    <Card style={{ marginBottom: 8 }}>
                        <View style={styles.row}>
                            <View style={styles.left}>
                                {item.image_url ? (
                                    <Image
                                        source={{ uri: item.image_url }}
                                        style={styles.thumb}
                                    />
                                ) : (
                                    <View style={[styles.thumb, styles.thumbFallback]}>
                                        <Text style={{ fontSize: 18 }}>🛒</Text>
                                    </View>
                                )}
                                <View style={{ flexShrink: 1 }}>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                                        {item.unit}
                                        {item.category
                                            ? ` · ${item.category.name}`
                                            : ''}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.actions}>
                                <Pressable onPress={() => openEdit(item)} hitSlop={6}>
                                    <Text style={styles.actionLink}>Editar</Text>
                                </Pressable>
                                <Pressable onPress={() => pickImage(item)} hitSlop={6}>
                                    <Text style={styles.actionLink}>
                                        {item.image_url ? 'Foto' : '+ Foto'}
                                    </Text>
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
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexShrink: 1,
    },
    thumb: {
        width: 40,
        height: 40,
        borderRadius: 10,
    },
    thumbFallback: {
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionLink: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
});
