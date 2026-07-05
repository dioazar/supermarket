import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Platform,
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

type Category = {
    id: number;
    name: string;
    parent_id: number | null;
    image_url: string | null;
    pantry_items_count: number;
};

const confirmAction = (title: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
        if (window.confirm(title)) onConfirm();
    } else {
        Alert.alert(title, undefined, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Sí', style: 'destructive', onPress: onConfirm },
        ]);
    }
};

export default function Categories() {
    const [categories, setCategories] = useState<Category[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [parentPickerOpen, setParentPickerOpen] = useState(false);
    const [error, setError] = useState('');
    const [renamingId, setRenamingId] = useState<number | null>(null);
    const [renameDraft, setRenameDraft] = useState('');

    const load = useCallback(async () => {
        setCategories(await api<Category[]>('/categories'));
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    if (!categories) return <Loading />;

    const roots = categories.filter((category) => !category.parent_id);
    // Raíces con sus hijas debajo, para renderizar plano en la FlatList.
    const ordered = roots.flatMap((root) => [
        root,
        ...categories.filter((category) => category.parent_id === root.id),
    ]);

    const create = async () => {
        if (!name.trim()) return;
        setError('');
        try {
            await api('/categories', {
                method: 'POST',
                body: {
                    name: name.trim(),
                    parent_id: parentId ? Number(parentId) : null,
                },
            });
            setName('');
            setParentId('');
            setCreating(false);
            load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Error');
        }
    };

    const pickImage = async (category: Category) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });

        if (result.canceled || !result.assets[0]) return;

        try {
            await apiUpload(`/categories/${category.id}/image`, 'image', result.assets[0]);
            load();
        } catch {
            setError('No se pudo subir la foto');
        }
    };

    const saveRename = async (category: Category) => {
        const value = renameDraft.trim();
        setRenamingId(null);
        if (!value || value === category.name) return;
        try {
            await api(`/categories/${category.id}`, {
                method: 'PATCH',
                body: { name: value },
            });
            load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Error');
        }
    };

    // Atajo "+ Sub": abre el formulario con el padre ya elegido.
    const addSub = (parent: Category) => {
        setParentId(String(parent.id));
        setName('');
        setError('');
        setCreating(true);
    };

    const remove = (category: Category) =>
        confirmAction(`¿Eliminar "${category.name}"?`, async () => {
            await api(`/categories/${category.id}`, { method: 'DELETE' });
            load();
        });

    return (
        <FlatList
            data={ordered}
            keyExtractor={(category) => String(category.id)}
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
                                placeholder="Ej: Limpieza"
                            />
                            <Picker
                                label="Dentro de (opcional)"
                                value={parentId}
                                options={[
                                    { value: '', label: '— ninguna (raíz) —' },
                                    ...roots.map((root) => ({
                                        value: String(root.id),
                                        label: root.name,
                                    })),
                                ]}
                                onChange={setParentId}
                                visible={parentPickerOpen}
                                setVisible={setParentPickerOpen}
                            />
                            {error !== '' && (
                                <Text style={{ color: colors.danger }}>{error}</Text>
                            )}
                            <Button title="Crear categoría" onPress={create} />
                            <Button
                                title="Cancelar"
                                variant="secondary"
                                onPress={() => setCreating(false)}
                            />
                        </Card>
                    ) : (
                        <Button
                            title="+ Nueva categoría"
                            onPress={() => setCreating(true)}
                        />
                    )}
                </View>
            }
            ListEmptyComponent={
                <EmptyState text="Sin categorías todavía. Creá la primera arriba." />
            }
            renderItem={({ item }) => (
                <Card
                    style={{
                        marginBottom: 8,
                        marginLeft: item.parent_id ? 24 : 0,
                    }}
                >
                    <View style={styles.row}>
                        <View style={styles.left}>
                            {item.parent_id !== null && (
                                <Text style={{ color: colors.muted }}>↳</Text>
                            )}
                            {item.image_url ? (
                                <Image
                                    source={{ uri: item.image_url }}
                                    style={styles.thumb}
                                />
                            ) : (
                                <View style={[styles.thumb, styles.thumbFallback]}>
                                    <Text style={{ fontSize: 18 }}>🏷️</Text>
                                </View>
                            )}
                            {renamingId === item.id ? (
                                <View style={{ flexGrow: 1 }}>
                                    <Input
                                        value={renameDraft}
                                        onChangeText={setRenameDraft}
                                        autoFocus
                                        onBlur={() => saveRename(item)}
                                        onSubmitEditing={() => saveRename(item)}
                                    />
                                </View>
                            ) : (
                                <Pressable
                                    style={{ flexShrink: 1 }}
                                    onPress={() => {
                                        setRenameDraft(item.name);
                                        setRenamingId(item.id);
                                    }}
                                >
                                    <Text style={styles.name}>{item.name}</Text>
                                    <Text
                                        style={{ color: colors.muted, fontSize: 12 }}
                                    >
                                        {item.pantry_items_count} productos en
                                        despensa
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                        <View style={styles.actions}>
                            {item.parent_id === null && (
                                <Pressable onPress={() => addSub(item)} hitSlop={6}>
                                    <Text style={styles.actionLink}>+ Sub</Text>
                                </Pressable>
                            )}
                            <Pressable onPress={() => pickImage(item)} hitSlop={6}>
                                <Text style={styles.actionLink}>
                                    {item.image_url ? 'Foto' : '+ Foto'}
                                </Text>
                            </Pressable>
                            <Pressable onPress={() => remove(item)} hitSlop={6}>
                                <Text style={{ color: colors.danger, fontSize: 12 }}>
                                    Eliminar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Card>
            )}
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
