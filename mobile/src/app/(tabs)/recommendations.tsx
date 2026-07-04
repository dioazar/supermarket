import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Badge, Button, Card, EmptyState, Loading } from '../../components/ui-kit';
import { api } from '../../lib/api';
import { Coords, formatDistance, getCurrentCoords } from '../../lib/location';
import { colors } from '../../lib/theme';

type Recommendation = {
    missing: {
        id: number;
        name: string;
        unit: string;
        needed: number;
        sources: string[];
    }[];
    stores: {
        id: number;
        name: string;
        address: string | null;
        website: string | null;
        distance_km: number | null;
        covered: number;
        total: number;
        offers_count: number;
        covered_products: {
            id: number;
            name: string;
            needed: number;
            price: number | null;
            list_price: number | null;
            on_sale: boolean;
        }[];
        missing_products: string[];
    }[];
    offers: {
        store: string;
        product: string;
        unit: string;
        price: number | null;
        sale_price: number;
        sale_ends_at: string | null;
        discount_pct: number | null;
    }[];
};

export default function Recommendations() {
    const [data, setData] = useState<Recommendation | null>(null);
    const [coords, setCoords] = useState<Coords | null>(null);
    const [locating, setLocating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(
        async (position: Coords | null = coords) => {
            const query = position
                ? `?lat=${position.lat}&lng=${position.lng}`
                : '';
            setData(await api<Recommendation>(`/recommendations${query}`));
        },
        [coords],
    );

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const locate = async () => {
        setLocating(true);
        const position = await getCurrentCoords();
        setCoords(position);
        await load(position);
        setLocating(false);
    };

    if (!data) return <Loading />;

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
            <Card style={{ gap: 8 }}>
                <Text style={styles.sectionTitle}>
                    Te faltan {data.missing.length} productos
                </Text>
                {data.missing.length === 0 ? (
                    <Text style={{ color: colors.muted }}>
                        ¡Nada pendiente! Despensa completa y sin ítems pendientes.
                    </Text>
                ) : (
                    <View style={styles.chips}>
                        {data.missing.map((product) => (
                            <View key={product.id} style={styles.chip}>
                                <Text style={{ color: colors.danger, fontSize: 13 }}>
                                    {product.name} · {product.needed} {product.unit}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </Card>

            <Button
                title={
                    locating
                        ? 'Buscando ubicación…'
                        : coords
                          ? '📍 Ubicación activa — actualizar'
                          : '📍 Ver distancias desde donde estoy'
                }
                variant={coords ? 'secondary' : 'primary'}
                onPress={locate}
                disabled={locating}
            />

            {data.offers.length > 0 && (
                <Card style={{ gap: 8 }}>
                    <Text style={styles.sectionTitle}>🏷️ Ofertas activas</Text>
                    {data.offers.map((offer, index) => (
                        <View key={index} style={styles.offerRow}>
                            <View style={{ flexShrink: 1 }}>
                                <Text style={{ fontWeight: '600' }}>
                                    {offer.product}
                                </Text>
                                <Text style={{ color: colors.muted, fontSize: 12 }}>
                                    {offer.store}
                                    {offer.sale_ends_at
                                        ? ` · hasta el ${new Date(
                                              offer.sale_ends_at + 'T00:00:00',
                                          ).toLocaleDateString()}`
                                        : ''}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 2 }}>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {offer.price != null && (
                                        <Text style={styles.strikePrice}>
                                            ${offer.price}
                                        </Text>
                                    )}
                                    <Text style={styles.salePrice}>
                                        ${offer.sale_price}
                                    </Text>
                                </View>
                                {offer.discount_pct != null && (
                                    <Badge
                                        text={`-${offer.discount_pct}%`}
                                        tone="warning"
                                    />
                                )}
                            </View>
                        </View>
                    ))}
                </Card>
            )}

            {data.missing.length > 0 && data.stores.length === 0 && (
                <EmptyState text="Cargá tiendas con productos y precios en la pestaña Tiendas para ver recomendaciones." />
            )}

            {data.missing.length > 0 &&
                data.stores.map((store, index) => (
                    <Card
                        key={store.id}
                        style={{
                            gap: 8,
                            borderWidth: index === 0 ? 2 : 0,
                            borderColor: colors.primary,
                        }}
                    >
                        <View style={styles.row}>
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.storeName}>
                                    {index === 0 ? '⭐ ' : ''}
                                    {store.name}
                                </Text>
                                <Text style={{ color: colors.muted, fontSize: 12 }}>
                                    {[
                                        store.address,
                                        formatDistance(store.distance_km),
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontWeight: '700' }}>
                                    {store.covered}/{data.missing.length}
                                </Text>
                                <Text style={{ color: colors.muted, fontSize: 12 }}>
                                    aprox. ${store.total}
                                </Text>
                                {store.offers_count > 0 && (
                                    <Badge
                                        text={`${store.offers_count} en oferta`}
                                        tone="warning"
                                    />
                                )}
                            </View>
                        </View>

                        <Text style={styles.subTitle}>Tiene:</Text>
                        <View style={styles.chips}>
                            {store.covered_products.map((product) => (
                                <View
                                    key={product.id}
                                    style={[
                                        styles.chip,
                                        {
                                            backgroundColor: product.on_sale
                                                ? colors.warningSoft
                                                : colors.primarySoft,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            color: product.on_sale
                                                ? colors.warning
                                                : colors.primaryDark,
                                        }}
                                    >
                                        {product.name}
                                        {product.price != null
                                            ? ` $${product.price}`
                                            : ''}
                                        {product.on_sale ? ' 🏷️' : ''}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {store.missing_products.length > 0 && (
                            <>
                                <Text style={[styles.subTitle, { color: colors.danger }]}>
                                    Te va a faltar:
                                </Text>
                                <Text style={{ color: colors.muted, fontSize: 13 }}>
                                    {store.missing_products.join(' · ')}
                                </Text>
                            </>
                        )}
                    </Card>
                ))}
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    subTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primaryDark,
        marginTop: 4,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        backgroundColor: colors.dangerSoft,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    offerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
    },
    storeName: {
        fontSize: 16,
        fontWeight: '700',
    },
    strikePrice: {
        color: colors.muted,
        textDecorationLine: 'line-through',
        fontSize: 13,
    },
    salePrice: {
        color: colors.warning,
        fontWeight: '800',
        fontSize: 15,
    },
});
