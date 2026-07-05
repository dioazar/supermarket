import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from 'react';
import { api, getToken, setToken } from './api';

type User = { id: number; name: string; email: string; avatar_url?: string | null };

type AuthContextValue = {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    loginWithToken: (token: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                if (await getToken()) {
                    setUser(await api<User>('/user'));
                }
            } catch {
                await setToken(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = async (email: string, password: string) => {
        const data = await api<{ token: string; user: User }>('/login', {
            method: 'POST',
            body: { email, password, device_name: 'superlista-app' },
        });
        await setToken(data.token);
        setUser(data.user);
    };

    // Para el login con Google: el backend redirige con un token Sanctum ya emitido.
    const loginWithToken = async (token: string) => {
        await setToken(token);
        setUser(await api<User>('/user'));
    };

    const register = async (name: string, email: string, password: string) => {
        const data = await api<{ token: string; user: User }>('/register', {
            method: 'POST',
            body: { name, email, password, device_name: 'superlista-app' },
        });
        await setToken(data.token);
        setUser(data.user);
    };

    const logout = async () => {
        try {
            await api('/logout', { method: 'POST' });
        } catch {
            // el token puede haber expirado; igual lo borramos localmente
        }
        await setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, login, loginWithToken, register, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return ctx;
}
