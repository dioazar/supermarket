import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { MapView, Marker as MapMarker } from '../../components/native-map';
import {
    Button,
    Card,
    EmptyState,
    Input,
    Loading,
    Picker,
} from '../../components/ui-kit';
import { api } from '../../lib/api';
import { Coords, formatDistance, getCurrentCoords } from '../../lib/location';
import { colors } from '../../lib/theme';

type Store = {
    id: number;
    name: string;
    address: string | null;
    products: {
        id: number;
        name: string;
        unit: string;
        pivot: { price: number | null };
    }[];
};

type NearbyPlace = {
    source: string;
    external_id: string;
    name: string;
    address: string | null;
    lat: number;
    lng: number;
    distance_km: number;
};

export default function Stores() {
    const [stores, setStores] = useState<Store[] | null>(null);
    const [products, setProducts] = useState<{ id: number; name: string; unit: string }[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [adding, setAdding] = useState(false);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [website, setWebsite] = useState('');
    const [coords, setCoords] = useState<Coords | null>(null);
    const [locating, setLocating] = useState(false);
    const [nearby, setNearby] = useState<NearbyPlace[] | null>(null);
    const [searchCenter, setSearchCenter] = useState<Coords | null>(null);
    const [searchingNearby, setSearchingNearby] = useState(false);
    const [nearbyError, setNearbyError] = useState('');

    // formulario "agregar producto" por tienda
    const [targetStore, setTargetStore] = useState<number | null>(null);
    const [productId, setProductId] = useState('');
    const [productName, setProductName] = useState('');
    const [price, setPrice] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);

    const load = useCallback(async () => {
        const [allStores, allProducts] = await Promise.all([
            api<Store[]>('/stores'),
            api<typeof products>('/products'),
        ]);
        setStores(allStores);
        setProducts(allProducts);
    }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const createStore = async () => {
        if (!name.trim()) return;
        await api('/stores', {
            method: 'POST',
            body: {
                name: name.trim(),
                address: address.trim() || null,
                website: website.trim() || null,
                lat: coords?.lat ?? null,
                lng: coords?.lng ?? null,
            },
        });
        setName('');
        setAddress('');
        setWebsite('');
        setCoords(null);
        setAdding(false);
        load();
    };

    const searchNearby = async () => {
        setSearchingNearby(true);
        setNearbyError('');
        const position = await getCurrentCoords();
        if (!position) {
            setNearbyError('No pudimos obtener tu ubicación. Revisá los permisos.');
            setSearchingNearby(false);
            return;
        }
        setSearchCenter(position);
        try {
            const data = await api<{ places: NearbyPlace[] }>(
                `/stores/nearby?lat=${position.lat}&lng=${position.lng}`,
            );
            setNearby(data.places);
        } catch {
            setNearbyError('No se pudieron buscar supermercados.');
        } finally {
            setSearchingNearby(false);
        }
    };

    const addNearby = async (place: NearbyPlace) => {
        await api('/stores', {
            method: 'POST',
            body: {
                name: place.name,
                address: place.address,
                lat: place.lat,
                lng: place.lng,
            },
        });
        load();
    };

    const attachProduct = async (storeId: number) => {
        await api(`/stores/${storeId}/products`, {
            method: 'POST',
            body: {
                product_id: productId ? Number(productId) : null,
                product_name: productId ? null : productName.trim() || null,
                price: price ? Number(price) : null,
            },
        });
        setProductId('');
        setProductName('');
        setPrice('');
        setTargetStore(null);
        load();
    };

    if (stores === null) return <Loading />;

    return (
        <FlatList
            data={stores}
            keyExtractor={(store) => String(store.id)}
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
                            <Input
                                label="Nombre"
                                value={name}
                                onChangeText={setName}
                                placeholder="Ej: Carrefour"
                            />
                            <Input
                                label="Dirección (opcional)"
                                value={address}
                                onChangeText={setAddress}
                            />
                            <Input
                                label="Sitio web (opcional)"
                                value={website}
                                onChangeText={setWebsite}
                                autoCapitalize="none"
                                keyboardType="url"
                                placeholder="https://www.cotodigital3.com.ar"
                            />
                            <Button
                                title={
                                    locating
                                        ? 'Buscando…'
                                        : coords
                                          ? '📍 Ubicación guardada ✓'
                                          : '📍 Estoy acá: usar mi ubicación'
                                }
                                variant="secondary"
                                disabled={locating}
                                onPress={async () => {
                                    setLocating(true);
                                    setCoords(await getCurrentCoords());
                                    setLocating(false);
                                }}
                            />
                            <Button title="Crear tienda" onPress={createStore} />
                            <Button
                                title="Cancelar"
                                variant="secondary"
                                onPress={() => setAdding(false)}
                            />
                        </Card>
                    ) : (
                        <Button title="+ Nueva tienda" onPress={() => setAdding(true)} />
                    )}

                    <Card style={{ gap: 8 }}>
                        <Text style={styles.storeName}>
                            🔍 Supermercados cerca tuyo
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 13 }}>
                            Busca los súper a menos de 1,5 km y agregalos con un
                            toque.
                        </Text>
                        <Button
                            title={
                                searchingNearby
                                    ? 'Buscando…'
                                    : nearby
                                      ? 'Buscar de nuevo'
                                      : '📍 Buscar cerca de mí'
                            }
                            variant="secondary"
                            disabled={searchingNearby}
                            onPress={searchNearby}
                        />
                        {nearbyError !== '' && (
                            <Text style={{ color: colors.danger, fontSize: 13 }}>
                                {nearbyError}
                            </Text>
                        )}
                        {nearby && nearby.length > 0 && MapView && searchCenter && (
                            <View style={{ height: 260, borderRadius: 14, overflow: 'hidden' }}>
                                <MapView
                                    style={{ flex: 1 }}
                                    initialRegion={{
                                        latitude: searchCenter.lat,
                                        longitude: searchCenter.lng,
                                        latitudeDelta: 0.015,
                                        longitudeDelta: 0.015,
                                    }}
                                >
                                    {nearby.map((place) => (
                                        <MapMarker
                                            key={`${place.source}-${place.external_id}`}
                                            coordinate={{
                                                latitude: place.lat,
                                                longitude: place.lng,
                                            }}
                                            title={place.name}
                                            description={place.address ?? undefined}
                                            pinColor={
                                                stores?.some((s) => s.name === place.name)
                                                    ? '#059669'
                                                    : '#e11d48'
                                            }
                                            onCalloutPress={() => addNearby(place)}
                                        />
                                    ))}
                                </MapView>
                                <Text style={{ color: colors.muted, fontSize: 11, padding: 4 }}>
                                    Tocá el globo de un marcador para agregarlo
                                </Text>
                            </View>
                        )}
                        {nearby && nearby.length === 0 && (
                            <Text style={{ color: colors.muted, fontSize: 13 }}>
                                No encontramos supermercados cerca.
                            </Text>
                        )}
                        {nearby?.map((place) => {
                            const added = stores?.some(
                                (store) => store.name === place.name,
                            );
                            return (
                                <View
                                    key={`${place.source}-${place.external_id}`}
                                    style={styles.row}
                                >
                                    <View style={{ flexShrink: 1 }}>
                                        <Text style={{ fontWeight: '600' }}>
                                            {place.name}
                                        </Text>
                                        <Text
                                            style={{
                                                color: colors.muted,
                                                fontSize: 12,
                                            }}
                                        >
                                            {[
                                                place.address,
                                                formatDistance(place.distance_km),
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </Text>
                                    </View>
                                    {added ? (
                                        <Text
                                            style={{
                                                color: colors.primary,
                                                fontSize: 12,
                                                fontWeight: '600',
                                            }}
                                        >
                                            Agregada ✓
                                        </Text>
                                    ) : (
                                        <Button
                                            title="+ Agregar"
                                            small
                                            onPress={() => addNearby(place)}
                                        />
                                    )}
                                </View>
                            );
                        })}
                    </Card>
                </View>
            }
            ListEmptyComponent={
                <EmptyState text="Agregá tiendas para recibir recomendaciones de dónde comprar." />
            }
            renderItem={({ item: store }) => (
                <Card style={{ marginBottom: 10, gap: 8 }}>
                    <View style={styles.row}>
                        <View style={{ flexShrink: 1 }}>
                            <Text style={styles.storeName}>{store.name}</Text>
                            {store.address && (
                                <Text style={{ color: colors.muted, fontSize: 12 }}>
                                    {store.address}
                                </Text>
                            )}
                        </View>
                        <Pressable
                            onPress={async () => {
                                const ok =
                                    Platform.OS === 'web'
                                        ? window.confirm('¿Eliminar tienda?')
                                        : true;
                                if (ok) {
                                    await api(`/stores/${store.id}`, { method: 'DELETE' });
                                    load();
                                }
                            }}
                        >
                            <Text style={{ color: colors.danger, fontSize: 12 }}>
                                Eliminar
                            </Text>
                        </Pressable>
                    </View>

                    {store.products.map((product) => (
                        <View key={product.id} style={styles.row}>
                            <Text style={{ fontSize: 14 }}>{product.name}</Text>
                            <View style={styles.rowRight}>
                                <Text style={{ color: colors.muted, fontSize: 13 }}>
                                    {product.pivot.price != null
                                        ? `$${product.pivot.price}`
                                        : 'sin precio'}
                                </Text>
                                <Pressable
                                    onPress={async () => {
                                        await api(
                                            `/stores/${store.id}/products/${product.id}`,
                                            { method: 'DELETE' },
                                        );
                                        load();
                                    }}
                                >
                                    <Text style={{ color: colors.muted }}>✕</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}

                    {targetStore === store.id ? (
                        <View style={{ gap: 10 }}>
                            <Picker
                                label="Producto"
                                value={productId}
                                options={[
                                    { value: '', label: '— producto nuevo —' },
                                    ...products.map((product) => ({
                                        value: String(product.id),
                                        label: product.name,
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
                                label="Precio"
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="decimal-pad"
                            />
                            <Button
                                title="Agregar producto"
                                onPress={() => attachProduct(store.id)}
                            />
                            <Button
                                title="Cancelar"
                                variant="secondary"
                                onPress={() => setTargetStore(null)}
                            />
                        </View>
                    ) : (
                        <Button
                            title="+ Producto y precio"
                            variant="secondary"
                            small
                            onPress={() => setTargetStore(store.id)}
                        />
                    )}
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
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '700',
    },
});
