import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input } from '../components/ui-kit';
import { api, ApiError, apiUpload } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

export default function Profile() {
    const { user, logout } = useAuth();
    const [name, setName] = useState(user?.name ?? '');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(
        (user as any)?.avatar_url ?? null,
    );
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const pickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });

        if (result.canceled || !result.assets[0]) return;

        setBusy(true);
        setMessage('');
        try {
            const updated = await apiUpload<{ avatar_url: string }>(
                '/profile/avatar',
                'avatar',
                result.assets[0],
            );
            setAvatarUrl(updated.avatar_url);
            setMessage('Foto actualizada ✓');
        } catch {
            setMessage('No se pudo subir la foto');
        } finally {
            setBusy(false);
        }
    };

    const saveName = async () => {
        setBusy(true);
        setMessage('');
        try {
            await api('/profile', { method: 'PATCH', body: { name: name.trim() } });
            setMessage('Nombre actualizado ✓');
        } catch {
            setMessage('No se pudo guardar');
        } finally {
            setBusy(false);
        }
    };

    const savePassword = async () => {
        setPasswordMessage('');
        setPasswordError('');
        if (newPassword !== confirmPassword) {
            setPasswordError('Las contraseñas no coinciden');
            return;
        }
        setBusy(true);
        try {
            await api('/profile/password', {
                method: 'PUT',
                body: {
                    current_password: currentPassword,
                    password: newPassword,
                    password_confirmation: confirmPassword,
                },
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordMessage('Contraseña actualizada ✓');
        } catch (e) {
            setPasswordError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cambiar la contraseña',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Mi perfil' }} />
            <ScrollView contentContainerStyle={styles.container}>
                <Card style={{ alignItems: 'center', gap: 12 }}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Text style={styles.avatarLetter}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <Text style={{ color: colors.muted }}>{user?.email}</Text>
                    <Button
                        title={
                            busy
                                ? '...'
                                : avatarUrl
                                  ? 'Cambiar foto'
                                  : 'Subir foto de perfil'
                        }
                        variant="secondary"
                        disabled={busy}
                        onPress={pickAvatar}
                    />
                </Card>

                <Card style={{ gap: 10 }}>
                    <Input label="Nombre" value={name} onChangeText={setName} />
                    <Button title="Guardar" onPress={saveName} disabled={busy} />
                    {message !== '' && (
                        <Text style={{ color: colors.primary, fontSize: 13 }}>
                            {message}
                        </Text>
                    )}
                </Card>

                <Card style={{ gap: 10 }}>
                    <Text style={styles.sectionTitle}>Cambiar contraseña</Text>
                    <Input
                        label="Contraseña actual"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        placeholder="Vacía si entrás con Google"
                    />
                    <Input
                        label="Nueva contraseña"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                    <Input
                        label="Repetir nueva contraseña"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                    <Button
                        title="Cambiar contraseña"
                        onPress={savePassword}
                        disabled={busy || !newPassword}
                    />
                    {passwordMessage !== '' && (
                        <Text style={{ color: colors.primary, fontSize: 13 }}>
                            {passwordMessage}
                        </Text>
                    )}
                    {passwordError !== '' && (
                        <Text style={{ color: colors.danger, fontSize: 13 }}>
                            {passwordError}
                        </Text>
                    )}
                </Card>

                <Button
                    title="Cerrar sesión"
                    variant="ghost"
                    onPress={async () => {
                        await logout();
                        router.replace('/login');
                    }}
                />
            </ScrollView>
        </>
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
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 999,
    },
    avatarFallback: {
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontSize: 36,
        fontWeight: '800',
        color: colors.primaryDark,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
});
