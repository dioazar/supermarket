import { router, useFocusEffect } from 'expo-router';
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
} from '../../components/ui-kit';
import { api } from '../../lib/api';
import { colors, roleLabels } from '../../lib/theme';

type ListSummary = {
    id: number;
    name: string;
    items_count: number;
    checked_count: number;
    recurrence_days: number | null;
    my_role: string;
    owner: { id: number; name: string };
};

export default function Lists() {
    const [lists, setLists] = useState<ListSummary[] | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const [recurrence, setRecurrence] = useState('');

    const load = useCallback(async () => {
        try {
            setLists(await api<ListSummary[]>('/lists'));
        } catch {
            setLists([]);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const create = async () => {
        if (!name.trim()) return;
        await api('/lists', {
            method: 'POST',
            body: {
                name: name.trim(),
                recurrence_days: recurrence ? Number(recurrence) : null,
            },
        });
        setName('');
        setRecurrence('');
        setCreating(false);
        load();
    };

    if (lists === null) return <Loading />;

    return (
        <FlatList
            data={lists}
            keyExtractor={(list) => String(list.id)}
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
                                label="Nombre de la lista"
                                value={name}
                                onChangeText={setName}
                                placeholder="Ej: Compra semanal"
                            />
                            <Input
                                label="Repetir cada X días (opcional)"
                                value={recurrence}
                                onChangeText={setRecurrence}
                                keyboardType="number-pad"
                                placeholder="7"
                            />
                            <Button title="Crear lista" onPress={create} />
                            <Button
                                title="Cancelar"
                                variant="secondary"
                                onPress={() => setCreating(false)}
                            />
                        </Card>
                    ) : (
                        <Button title="+ Nueva lista" onPress={() => setCreating(true)} />
                    )}
                </View>
            }
            ListEmptyComponent={<EmptyState text="No tenés listas todavía." />}
            renderItem={({ item }) => {
                const progress = item.items_count
                    ? item.checked_count / item.items_count
                    : 0;
                return (
                    <Pressable onPress={() => router.push(`/list/${item.id}`)}>
                        <Card style={{ marginBottom: 10 }}>
                            <View style={styles.row}>
                                <Text style={styles.listName}>{item.name}</Text>
                                <Badge text={roleLabels[item.my_role] ?? item.my_role} />
                            </View>
                            <Text style={{ color: colors.muted, fontSize: 13 }}>
                                de {item.owner.name}
                                {item.recurrence_days
                                    ? ` · cada ${item.recurrence_days} días`
                                    : ''}
                            </Text>
                            <View style={styles.progressTrack}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${progress * 100}%` },
                                    ]}
                                />
                            </View>
                            <Text style={{ color: colors.muted, fontSize: 12 }}>
                                {item.checked_count}/{item.items_count} comprados
                            </Text>
                        </Card>
                    </Pressable>
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
    listName: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
        flexShrink: 1,
    },
    progressTrack: {
        height: 6,
        borderRadius: 999,
        backgroundColor: colors.border,
        overflow: 'hidden',
        marginTop: 4,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
});
