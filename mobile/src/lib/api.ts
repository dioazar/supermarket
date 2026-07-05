import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// En web y simulador apunta a localhost; en un teléfono físico usa la IP
// de la máquina que corre `expo start` (hostUri), que debe ser la misma
// que corre `php artisan serve --host=0.0.0.0`.
function resolveBaseUrl(): string {
    if (Platform.OS === 'web') return 'http://localhost:8000/api';

    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    return `http://${host ?? 'localhost'}:8000/api`;
}

export const API_URL = resolveBaseUrl();

const TOKEN_KEY = 'superlista.token';

export async function getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
    if (token === null) {
        await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    }
}

export class ApiError extends Error {
    status: number;
    errors?: Record<string, string[]>;

    constructor(status: number, message: string, errors?: Record<string, string[]>) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

/** Sube un archivo (imagen) como multipart/form-data. */
export async function apiUpload<T = any>(
    path: string,
    field: string,
    file: { uri: string; name?: string; mimeType?: string },
): Promise<T> {
    const token = await getToken();
    const form = new FormData();

    if (Platform.OS === 'web') {
        const blob = await (await fetch(file.uri)).blob();
        form.append(field, blob, file.name ?? 'photo.jpg');
    } else {
        form.append(field, {
            uri: file.uri,
            name: file.name ?? 'photo.jpg',
            type: file.mimeType ?? 'image/jpeg',
        } as any);
    }

    const response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: form,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new ApiError(response.status, data.message ?? `Error ${response.status}`, data.errors);
    }

    return data as T;
}

export async function api<T = any>(
    path: string,
    options: { method?: string; body?: object } = {},
): Promise<T> {
    const token = await getToken();

    const response = await fetch(`${API_URL}${path}`, {
        method: options.method ?? 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 204) return undefined as T;

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new ApiError(
            response.status,
            data.message ?? `Error ${response.status}`,
            data.errors,
        );
    }

    return data as T;
}
