import { Redirect, router, Tabs } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { Loading } from '../../components/ui-kit';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

function AvatarButton() {
    const { user } = useAuth();

    return (
        <Pressable
            onPress={() => router.push('/profile' as never)}
            style={{ marginRight: 14 }}
            hitSlop={8}
        >
            {user?.avatar_url ? (
                <Image
                    source={{ uri: user.avatar_url }}
                    style={{ width: 32, height: 32, borderRadius: 999 }}
                />
            ) : (
                <View
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        backgroundColor: colors.primarySoft,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text
                        style={{
                            fontWeight: '800',
                            color: colors.primaryDark,
                            fontSize: 14,
                        }}
                    >
                        {user?.name?.charAt(0).toUpperCase() ?? '?'}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}

export default function TabsLayout() {
    const { user, loading } = useAuth();

    if (loading) return <Loading />;
    if (!user) return <Redirect href="/login" />;

    return (
        <Tabs
            initialRouteName="home"
            screenOptions={{
                headerStyle: { backgroundColor: colors.card },
                headerRight: () => <AvatarButton />,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.muted,
                tabBarStyle: { backgroundColor: colors.card },
                sceneStyle: { backgroundColor: colors.background },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Inicio',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Listas',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="📝" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="pantry"
                options={{
                    title: 'Despensa',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🥫" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="recommendations"
                options={{
                    title: 'Comprar',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="stores"
                options={{
                    title: 'Tiendas',
                    tabBarIcon: ({ focused }) => <TabIcon emoji="🏪" focused={focused} />,
                }}
            />
        </Tabs>
    );
}
