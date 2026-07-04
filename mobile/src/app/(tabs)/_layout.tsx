import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Loading } from '../../components/ui-kit';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
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
