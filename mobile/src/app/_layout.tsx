import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';
import { colors } from '../lib/theme';

export default function RootLayout() {
    return (
        <AuthProvider>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerTintColor: colors.text,
                    headerStyle: { backgroundColor: colors.card },
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="list/[id]" options={{ title: 'Lista' }} />
            </Stack>
        </AuthProvider>
    );
}
