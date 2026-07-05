import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Linking,
    Platform,
    Pressable,
    Share,
    StyleSheet,
    Text,
    TextInput,
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
import { api, ApiError } from '../../lib/api';
import { colors, roleLabels } from '../../lib/theme';

type Item = {
    id: number;
    quantity: number;
    status: 'pending' | 'checked' | 'missing';
    product: { id: number; name: string; unit: string; image_url?: string | null };
};

type Settlement = {
    expenses: { id: number; user_id: number; user: string; amount: number; note: string | null }[];
    total: number;
    share: number;
    balances: { user_id: number; name: string; paid: number; balance: number }[];
    transfers: { from: string; to: string; amount: number; phrase: string }[];
};

type Detail = {
    list: {
        id: number;
        name: string;
        owner_id: number;
        recurrence_days: number | null;
        owner: { name: string };
    };
    items: Item[];
    members: { id: number; name: string; email: string; role: string }[];
    my_role: string;
    expenses: Settlement;
    can: { edit: boolean; share: boolean; delete: boolean };
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

export default function ListDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [detail, setDetail] = useState<Detail | null>(null);
    const [shoppingMode, setShoppingMode] = useState(false);
    const [products, setProducts] = useState<{ id: number; name: string; unit: string }[]>([]);
    const [adding, setAdding] = useState(false);
    const [productId, setProductId] = useState('');
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [editingList, setEditingList] = useState(false);
    const [editName, setEditName] = useState('');
    const [editRecurrence, setEditRecurrence] = useState('');
    const [qtyEditId, setQtyEditId] = useState<number | null>(null);
    const [qtyDraft, setQtyDraft] = useState('');
    const [sharing, setSharing] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [shareRole, setShareRole] = useState('list-editor');
    const [rolePickerOpen, setRolePickerOpen] = useState(false);
    const [error, setError] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseNote, setExpenseNote] = useState('');
    const [onlineStores, setOnlineStores] = useState<
        { id: number; name: string; website: string }[]
    >([]);

    const load = useCallback(async () => {
        setDetail(await api<Detail>(`/lists/${id}`));
    }, [id]);

    useEffect(() => {
        load();
        api<typeof products>('/products').then(setProducts);
        api<{ id: number; name: string; website: string | null }[]>('/stores').then(
            (stores) =>
                setOnlineStores(
                    stores.filter((s): s is (typeof onlineStores)[number] => !!s.website),
                ),
        );
    }, [load]);

    const cartText = () =>
        detail!.items
            .filter((item) => item.status !== 'checked')
            .map((item) => `- ${item.quantity} ${item.product.unit} ${item.product.name}`)
            .join('\n');

    const exportCart = async (store?: { name: string; website: string }) => {
        const text = `🛒 ${detail!.list.name}\n${cartText()}`;

        if (Platform.OS === 'web') {
            await navigator.clipboard?.writeText(text);
            if (store) {
                window.open(store.website, '_blank');
            } else {
                window.alert('Carrito copiado al portapapeles ✓');
            }
        } else {
            if (store) {
                // copiamos vía share primero, después abrimos la web del súper
                await Share.share({ message: text });
                await Linking.openURL(store.website);
            } else {
                await Share.share({ message: text });
            }
        }
    };

    if (!detail) return <Loading />;

    const { list, items, members, can, expenses } = detail;
    const checked = items.filter((item) => item.status === 'checked').length;

    const setStatus = async (item: Item, status: Item['status']) => {
        // Optimista: actualiza la UI al toque, revierte si falla.
        setDetail((current) =>
            current
                ? {
                      ...current,
                      items: current.items.map((i) =>
                          i.id === item.id ? { ...i, status } : i,
                      ),
                  }
                : current,
        );
        try {
            await api(`/items/${item.id}`, { method: 'PATCH', body: { status } });
        } catch {
            load();
        }
    };

    const openEditList = () => {
        setEditName(list.name);
        setEditRecurrence(list.recurrence_days ? String(list.recurrence_days) : '');
        setError('');
        setEditingList(true);
    };

    const saveList = async () => {
        setError('');
        try {
            await api(`/lists/${list.id}`, {
                method: 'PATCH',
                body: {
                    name: editName.trim(),
                    recurrence_days: editRecurrence ? Number(editRecurrence) : null,
                },
            });
            setEditingList(false);
            load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Error');
        }
    };

    const changeQuantity = async (item: Item, newQuantity: number) => {
        if (!(newQuantity > 0)) return;
        setDetail((current) =>
            current
                ? {
                      ...current,
                      items: current.items.map((i) =>
                          i.id === item.id ? { ...i, quantity: newQuantity } : i,
                      ),
                  }
                : current,
        );
        try {
            await api(`/items/${item.id}`, {
                method: 'PATCH',
                body: { quantity: newQuantity },
            });
        } catch {
            load();
        }
    };

    const commitQtyDraft = (item: Item) => {
        const value = Number(qtyDraft.replace(',', '.'));
        setQtyEditId(null);
        if (value > 0 && value !== item.quantity) changeQuantity(item, value);
    };

    const resetList = () =>
        confirmAction('¿Marcar todo como pendiente?', async () => {
            await api(`/lists/${list.id}/reset`, { method: 'POST' });
            load();
        });

    const addItem = async () => {
        setError('');
        try {
            await api(`/lists/${list.id}/items`, {
                method: 'POST',
                body: {
                    product_id: productId ? Number(productId) : null,
                    product_name: productId ? null : productName.trim() || null,
                    quantity: Number(quantity) || 1,
                },
            });
            setProductId('');
            setProductName('');
            setQuantity('1');
            setAdding(false);
            load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Error');
        }
    };

    const addExpense = async () => {
        const amount = Number(expenseAmount);
        if (!amount) return;
        await api(`/lists/${list.id}/expenses`, {
            method: 'POST',
            body: { amount, note: expenseNote.trim() || null },
        });
        setExpenseAmount('');
        setExpenseNote('');
        load();
    };

    const share = async () => {
        setError('');
        try {
            await api(`/lists/${list.id}/share`, {
                method: 'POST',
                body: { email: shareEmail.trim(), role: shareRole },
            });
            setShareEmail('');
            setSharing(false);
            load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Error');
        }
    };

    const productOptions = [
        { value: '', label: '— producto nuevo —' },
        ...products.map((product) => ({
            value: String(product.id),
            label: `${product.name} (${product.unit})`,
        })),
    ];

    return (
        <>
            <Stack.Screen options={{ title: list.name }} />
            <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.container}
                ListHeaderComponent={
                    <View style={{ gap: 12, marginBottom: 12 }}>
                        <Text style={{ color: colors.muted }}>
                            de {list.owner.name} · {roleLabels[detail.my_role]}
                            {list.recurrence_days
                                ? ` · cada ${list.recurrence_days} días`
                                : ''}
                        </Text>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${items.length ? (checked / items.length) * 100 : 0}%`,
                                    },
                                ]}
                            />
                        </View>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                            {checked} de {items.length} comprados
                        </Text>

                        {can.edit && (
                            <Button
                                title={
                                    shoppingMode
                                        ? '✔ Salir del modo súper'
                                        : '🛒 Modo súper'
                                }
                                onPress={() => setShoppingMode(!shoppingMode)}
                            />
                        )}

                        {can.edit && !shoppingMode && !editingList && (
                            <Button
                                title="✏️ Editar lista"
                                variant="secondary"
                                onPress={openEditList}
                            />
                        )}

                        {can.edit && !shoppingMode && editingList && (
                            <Card style={{ gap: 10 }}>
                                <Input
                                    label="Nombre de la lista"
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Ej: Compra semanal"
                                />
                                <Input
                                    label="Repetir cada X días (opcional)"
                                    value={editRecurrence}
                                    onChangeText={setEditRecurrence}
                                    keyboardType="number-pad"
                                    placeholder="7"
                                />
                                {error !== '' && (
                                    <Text style={{ color: colors.danger }}>{error}</Text>
                                )}
                                <Button title="Guardar cambios" onPress={saveList} />
                                <Button
                                    title="Cancelar"
                                    variant="secondary"
                                    onPress={() => setEditingList(false)}
                                />
                            </Card>
                        )}

                        {can.edit &&
                            !shoppingMode &&
                            items.some((item) => item.status !== 'pending') && (
                                <Button
                                    title="↺ Reiniciar compra (todo pendiente)"
                                    variant="secondary"
                                    onPress={resetList}
                                />
                            )}

                        {can.edit && !shoppingMode && !adding && (
                            <Button
                                title="+ Agregar producto"
                                variant="secondary"
                                onPress={() => setAdding(true)}
                            />
                        )}

                        {can.edit && !shoppingMode && adding && (
                            <Card style={{ gap: 10 }}>
                                <Picker
                                    label="Producto"
                                    value={productId}
                                    options={productOptions}
                                    onChange={setProductId}
                                    visible={pickerOpen}
                                    setVisible={setPickerOpen}
                                />
                                {!productId && (
                                    <Input
                                        label="Nombre nuevo"
                                        value={productName}
                                        onChangeText={setProductName}
                                        placeholder="Ej: Café"
                                    />
                                )}
                                <Input
                                    label="Cantidad"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="decimal-pad"
                                />
                                {error !== '' && (
                                    <Text style={{ color: colors.danger }}>{error}</Text>
                                )}
                                <Button title="Agregar" onPress={addItem} />
                                <Button
                                    title="Cancelar"
                                    variant="secondary"
                                    onPress={() => setAdding(false)}
                                />
                            </Card>
                        )}
                    </View>
                }
                ListEmptyComponent={<EmptyState text="La lista está vacía." />}
                renderItem={({ item }) => (
                    <Card
                        style={{
                            marginBottom: 8,
                            backgroundColor:
                                item.status === 'checked'
                                    ? colors.primarySoft
                                    : item.status === 'missing'
                                      ? colors.dangerSoft
                                      : colors.card,
                        }}
                    >
                        <View style={styles.itemRow}>
                            <View style={{ flexShrink: 1 }}>
                                <Text
                                    style={[
                                        styles.itemName,
                                        item.status === 'checked' && {
                                            textDecorationLine: 'line-through',
                                            color: colors.primary,
                                        },
                                        item.status === 'missing' && {
                                            color: colors.danger,
                                        },
                                    ]}
                                >
                                    {item.product.name}
                                </Text>
                                {can.edit && !shoppingMode ? (
                                    <View style={styles.qtyRow}>
                                        <Pressable
                                            onPress={() =>
                                                changeQuantity(item, item.quantity - 1)
                                            }
                                            disabled={item.quantity <= 1}
                                            style={[
                                                styles.qtyButton,
                                                item.quantity <= 1 && { opacity: 0.35 },
                                            ]}
                                        >
                                            <Text style={styles.qtyButtonText}>−</Text>
                                        </Pressable>
                                        {qtyEditId === item.id ? (
                                            <TextInput
                                                value={qtyDraft}
                                                onChangeText={setQtyDraft}
                                                keyboardType="decimal-pad"
                                                autoFocus
                                                selectTextOnFocus
                                                onBlur={() => commitQtyDraft(item)}
                                                onSubmitEditing={() =>
                                                    commitQtyDraft(item)
                                                }
                                                style={styles.qtyInput}
                                            />
                                        ) : (
                                            <Pressable
                                                onPress={() => {
                                                    setQtyDraft(String(item.quantity));
                                                    setQtyEditId(item.id);
                                                }}
                                            >
                                                <Text style={styles.qtyText}>
                                                    {item.quantity} {item.product.unit}
                                                </Text>
                                            </Pressable>
                                        )}
                                        <Pressable
                                            onPress={() =>
                                                changeQuantity(item, item.quantity + 1)
                                            }
                                            style={styles.qtyButton}
                                        >
                                            <Text style={styles.qtyButtonText}>+</Text>
                                        </Pressable>
                                    </View>
                                ) : (
                                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                                        {item.quantity} {item.product.unit}
                                        {item.status === 'missing' ? ' · no había' : ''}
                                    </Text>
                                )}
                            </View>

                            {can.edit && (
                                <View style={styles.itemActions}>
                                    <Pressable
                                        onPress={() =>
                                            setStatus(
                                                item,
                                                item.status === 'checked'
                                                    ? 'pending'
                                                    : 'checked',
                                            )
                                        }
                                        style={[
                                            styles.bigButton,
                                            {
                                                backgroundColor:
                                                    item.status === 'checked'
                                                        ? colors.primary
                                                        : colors.primarySoft,
                                            },
                                            shoppingMode && styles.bigButtonShopping,
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    item.status === 'checked'
                                                        ? '#fff'
                                                        : colors.primary,
                                                fontWeight: '700',
                                                fontSize: shoppingMode ? 15 : 13,
                                            }}
                                        >
                                            ✓{shoppingMode ? ' Lo tengo' : ''}
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() =>
                                            setStatus(
                                                item,
                                                item.status === 'missing'
                                                    ? 'pending'
                                                    : 'missing',
                                            )
                                        }
                                        style={[
                                            styles.bigButton,
                                            {
                                                backgroundColor:
                                                    item.status === 'missing'
                                                        ? colors.danger
                                                        : colors.dangerSoft,
                                            },
                                            shoppingMode && styles.bigButtonShopping,
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    item.status === 'missing'
                                                        ? '#fff'
                                                        : colors.danger,
                                                fontWeight: '700',
                                                fontSize: shoppingMode ? 15 : 13,
                                            }}
                                        >
                                            ✗{shoppingMode ? ' No hay' : ''}
                                        </Text>
                                    </Pressable>
                                    {!shoppingMode && (
                                        <Pressable
                                            onPress={() =>
                                                confirmAction('¿Quitar producto?', async () => {
                                                    await api(`/items/${item.id}`, {
                                                        method: 'DELETE',
                                                    });
                                                    load();
                                                })
                                            }
                                            style={styles.deleteButton}
                                        >
                                            <Text style={{ color: colors.muted }}>🗑</Text>
                                        </Pressable>
                                    )}
                                </View>
                            )}
                        </View>
                    </Card>
                )}
                ListFooterComponent={
                    !shoppingMode ? (
                        <View style={{ gap: 12, marginTop: 12 }}>
                            {items.some((item) => item.status !== 'checked') && (
                                <Card style={{ gap: 10 }}>
                                    <Text style={styles.sectionTitle}>
                                        🛍️ Carrito online
                                    </Text>
                                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                                        Compartí lo pendiente o abrilo en la web del
                                        súper (el carrito se copia para pegarlo ahí).
                                    </Text>
                                    <Button
                                        title="Compartir carrito"
                                        variant="secondary"
                                        onPress={() => exportCart()}
                                    />
                                    {onlineStores.map((store) => (
                                        <Button
                                            key={store.id}
                                            title={`Abrir en ${store.name}`}
                                            variant="secondary"
                                            onPress={() => exportCart(store)}
                                        />
                                    ))}
                                </Card>
                            )}
                            {members.length > 1 && expenses && (
                                <Card style={{ gap: 10 }}>
                                    <Text style={styles.sectionTitle}>
                                        💸 Gastos compartidos
                                    </Text>
                                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                                        Cada uno anota lo que gastó y el total
                                        se divide en partes iguales.
                                    </Text>
                                    <Input
                                        label="Gasté ($)"
                                        value={expenseAmount}
                                        onChangeText={setExpenseAmount}
                                        keyboardType="decimal-pad"
                                        placeholder="0.00"
                                    />
                                    <Input
                                        label="Nota (opcional)"
                                        value={expenseNote}
                                        onChangeText={setExpenseNote}
                                        placeholder="Ej: carnicería"
                                    />
                                    <Button
                                        title="Anotar gasto"
                                        variant="secondary"
                                        onPress={addExpense}
                                    />

                                    {expenses.expenses.length > 0 && (
                                        <>
                                            {expenses.expenses.map((expense) => (
                                                <View
                                                    key={expense.id}
                                                    style={styles.itemRow}
                                                >
                                                    <Text style={{ flexShrink: 1 }}>
                                                        <Text
                                                            style={{
                                                                fontWeight: '600',
                                                            }}
                                                        >
                                                            {expense.user}
                                                        </Text>{' '}
                                                        puso ${expense.amount}
                                                        {expense.note ? (
                                                            <Text
                                                                style={{
                                                                    color: colors.muted,
                                                                }}
                                                            >
                                                                {' '}
                                                                · {expense.note}
                                                            </Text>
                                                        ) : null}
                                                    </Text>
                                                    <Pressable
                                                        onPress={() =>
                                                            confirmAction(
                                                                '¿Quitar este gasto?',
                                                                async () => {
                                                                    await api(
                                                                        `/expenses/${expense.id}`,
                                                                        {
                                                                            method: 'DELETE',
                                                                        },
                                                                    );
                                                                    load();
                                                                },
                                                            )
                                                        }
                                                        hitSlop={6}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: colors.danger,
                                                                fontSize: 12,
                                                            }}
                                                        >
                                                            Quitar
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            ))}

                                            <View style={styles.expenseSummary}>
                                                <Text style={{ fontSize: 13 }}>
                                                    Total{' '}
                                                    <Text
                                                        style={{
                                                            fontWeight: '800',
                                                        }}
                                                    >
                                                        ${expenses.total}
                                                    </Text>{' '}
                                                    · a cada uno le toca{' '}
                                                    <Text
                                                        style={{
                                                            fontWeight: '800',
                                                        }}
                                                    >
                                                        ${expenses.share}
                                                    </Text>
                                                </Text>
                                                {expenses.balances.map((balance) => (
                                                    <View
                                                        key={balance.user_id}
                                                        style={styles.itemRow}
                                                    >
                                                        <Text
                                                            style={{ fontSize: 13 }}
                                                        >
                                                            {balance.name}
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: '600',
                                                                color:
                                                                    balance.balance >= 0
                                                                        ? colors.primary
                                                                        : colors.danger,
                                                            }}
                                                        >
                                                            puso ${balance.paid} (
                                                            {balance.balance >= 0
                                                                ? '+'
                                                                : ''}
                                                            {balance.balance})
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>

                                            {expenses.transfers.length > 0 ? (
                                                expenses.transfers.map(
                                                    (transfer, index) => (
                                                        <Text
                                                            key={index}
                                                            style={
                                                                styles.transferPhrase
                                                            }
                                                        >
                                                            👉 {transfer.phrase}
                                                        </Text>
                                                    ),
                                                )
                                            ) : (
                                                <Text
                                                    style={{
                                                        color: colors.primary,
                                                        fontWeight: '600',
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    ✓ Cuentas saldadas, nadie debe
                                                    nada.
                                                </Text>
                                            )}
                                        </>
                                    )}
                                </Card>
                            )}
                            {can.share && (
                                <Card style={{ gap: 10 }}>
                                    <Text style={styles.sectionTitle}>
                                        Compartida con
                                    </Text>
                                    {members.map((member) => (
                                        <View key={member.id} style={styles.itemRow}>
                                            <Text style={{ flexShrink: 1 }}>
                                                {member.name}{' '}
                                                <Text style={{ color: colors.muted }}>
                                                    ({member.email})
                                                </Text>
                                            </Text>
                                            <View style={styles.itemActions}>
                                                {member.id === list.owner_id ? (
                                                    <Badge
                                                        text={
                                                            roleLabels[member.role] ??
                                                            member.role
                                                        }
                                                    />
                                                ) : (
                                                    <Pressable
                                                        onPress={async () => {
                                                            // Toca para alternar Editor ↔ Solo lectura.
                                                            await api(
                                                                `/lists/${list.id}/share`,
                                                                {
                                                                    method: 'POST',
                                                                    body: {
                                                                        email: member.email,
                                                                        role:
                                                                            member.role ===
                                                                            'list-editor'
                                                                                ? 'list-viewer'
                                                                                : 'list-editor',
                                                                    },
                                                                },
                                                            );
                                                            load();
                                                        }}
                                                        hitSlop={6}
                                                        style={styles.roleToggle}
                                                    >
                                                        <Text
                                                            style={{
                                                                color: colors.primary,
                                                                fontSize: 12,
                                                                fontWeight: '600',
                                                            }}
                                                        >
                                                            {roleLabels[member.role] ??
                                                                member.role}{' '}
                                                            ⇄
                                                        </Text>
                                                    </Pressable>
                                                )}
                                                {member.id !== list.owner_id && (
                                                    <Pressable
                                                        onPress={() =>
                                                            confirmAction(
                                                                `¿Quitar a ${member.name}?`,
                                                                async () => {
                                                                    await api(
                                                                        `/lists/${list.id}/share/${member.id}`,
                                                                        { method: 'DELETE' },
                                                                    );
                                                                    load();
                                                                },
                                                            )
                                                        }
                                                    >
                                                        <Text
                                                            style={{
                                                                color: colors.danger,
                                                                fontSize: 12,
                                                            }}
                                                        >
                                                            Quitar
                                                        </Text>
                                                    </Pressable>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                    {sharing ? (
                                        <>
                                            <Input
                                                label="Email del usuario"
                                                value={shareEmail}
                                                onChangeText={setShareEmail}
                                                autoCapitalize="none"
                                                keyboardType="email-address"
                                            />
                                            <Picker
                                                label="Rol"
                                                value={shareRole}
                                                options={[
                                                    {
                                                        value: 'list-editor',
                                                        label: 'Editor',
                                                    },
                                                    {
                                                        value: 'list-viewer',
                                                        label: 'Solo lectura',
                                                    },
                                                ]}
                                                onChange={setShareRole}
                                                visible={rolePickerOpen}
                                                setVisible={setRolePickerOpen}
                                            />
                                            {error !== '' && (
                                                <Text style={{ color: colors.danger }}>
                                                    {error}
                                                </Text>
                                            )}
                                            <Button title="Compartir" onPress={share} />
                                            <Button
                                                title="Cancelar"
                                                variant="secondary"
                                                onPress={() => setSharing(false)}
                                            />
                                        </>
                                    ) : (
                                        <Button
                                            title="+ Compartir con alguien"
                                            variant="secondary"
                                            onPress={() => setSharing(true)}
                                        />
                                    )}
                                </Card>
                            )}
                            {can.delete && (
                                <Button
                                    title="Eliminar lista"
                                    variant="ghost"
                                    onPress={() =>
                                        confirmAction('¿Eliminar esta lista?', async () => {
                                            await api(`/lists/${list.id}`, {
                                                method: 'DELETE',
                                            });
                                            router.back();
                                        })
                                    }
                                />
                            )}
                        </View>
                    ) : null
                }
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    progressTrack: {
        height: 8,
        borderRadius: 999,
        backgroundColor: colors.border,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bigButton: {
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    bigButtonShopping: {
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    deleteButton: {
        padding: 6,
    },
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    qtyButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 20,
    },
    qtyText: {
        color: colors.muted,
        fontSize: 13,
        textDecorationLine: 'underline',
        textDecorationStyle: 'dotted',
    },
    qtyInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingVertical: 2,
        paddingHorizontal: 8,
        minWidth: 56,
        fontSize: 13,
        color: colors.text,
        backgroundColor: colors.card,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    roleToggle: {
        backgroundColor: colors.primarySoft,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    expenseSummary: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 10,
        gap: 4,
    },
    transferPhrase: {
        backgroundColor: colors.warningSoft,
        color: colors.warning,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        fontSize: 13,
        fontWeight: '600',
        overflow: 'hidden',
    },
});
