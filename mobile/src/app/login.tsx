import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
} from 'react-native';
import { Button, Card, Input } from '../components/ui-kit';
import { api, API_URL, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

// http://host:8000/api → http://host:8000 (rutas web del backend)
const BACKEND_URL = API_URL.replace(/\/api$/, '');

export default function Login() {
    const { login, loginWithToken, register } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [googleAvailable, setGoogleAvailable] = useState(false);

    useEffect(() => {
        api<{ google: boolean }>('/auth/providers')
            .then((providers) => setGoogleAvailable(providers.google))
            .catch(() => setGoogleAvailable(false));

        // En web el backend vuelve a /login?token=... después de Google.
        if (Platform.OS === 'web') {
            const token = new URLSearchParams(window.location.search).get('token');
            if (token) {
                window.history.replaceState({}, '', window.location.pathname);
                loginWithToken(token)
                    .then(() => router.replace('/(tabs)'))
                    .catch(() => setError('No se pudo iniciar sesión con Google'));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const googleLogin = async () => {
        setError('');

        if (Platform.OS === 'web') {
            const redirect = `${window.location.origin}/login`;
            window.location.href =
                `${BACKEND_URL}/auth/google/redirect?mobile=1` +
                `&redirect_uri=${encodeURIComponent(redirect)}`;
            return;
        }

        // Nativo: el backend redirige a exp://... (Expo Go) o mobile://... con el token.
        const redirect = Linking.createURL('login');
        const result = await WebBrowser.openAuthSessionAsync(
            `${BACKEND_URL}/auth/google/redirect?mobile=1` +
                `&redirect_uri=${encodeURIComponent(redirect)}`,
            redirect,
        );

        if (result.type !== 'success') return;

        const token = Linking.parse(result.url).queryParams?.token;
        if (typeof token !== 'string') {
            setError('No se pudo iniciar sesión con Google');
            return;
        }

        try {
            await loginWithToken(token);
            router.replace('/(tabs)');
        } catch {
            setError('No se pudo iniciar sesión con Google');
        }
    };

    const submit = async () => {
        setBusy(true);
        setError('');
        try {
            if (mode === 'login') {
                await login(email.trim(), password);
            } else {
                await register(name.trim(), email.trim(), password);
            }
            router.replace('/(tabs)');
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'No se pudo conectar al servidor');
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.logo}>🛒 SuperLista</Text>
                <Card style={{ gap: 14 }}>
                    <Text style={styles.title}>
                        {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
                    </Text>
                    {mode === 'register' && (
                        <Input
                            label="Nombre"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    )}
                    <Input
                        label="Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="demo@superlista.test"
                    />
                    <Input
                        label="Contraseña"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholder="password"
                    />
                    {error !== '' && <Text style={styles.error}>{error}</Text>}
                    <Button
                        title={
                            busy
                                ? '...'
                                : mode === 'login'
                                  ? 'Entrar'
                                  : 'Registrarme'
                        }
                        onPress={submit}
                        disabled={busy}
                    />
                    <Button
                        title={
                            mode === 'login'
                                ? '¿No tenés cuenta? Registrate'
                                : 'Ya tengo cuenta'
                        }
                        variant="secondary"
                        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
                    />
                    {googleAvailable && (
                        <Button
                            title="Continuar con Google"
                            variant="secondary"
                            onPress={googleLogin}
                        />
                    )}
                </Card>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        gap: 20,
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
    },
    logo: {
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        color: colors.text,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    error: {
        color: colors.danger,
        fontSize: 14,
    },
});
