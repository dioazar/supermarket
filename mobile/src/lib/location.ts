import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type Coords = { lat: number; lng: number };

/** Ubicación actual, cross-platform (web usa la API del navegador). */
export async function getCurrentCoords(): Promise<Coords | null> {
    try {
        if (Platform.OS === 'web') {
            return await new Promise((resolve) => {
                if (!('geolocation' in navigator)) return resolve(null);
                navigator.geolocation.getCurrentPosition(
                    (position) =>
                        resolve({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        }),
                    () => resolve(null),
                    { timeout: 8000 },
                );
            });
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return null;

        const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        return {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
        };
    } catch {
        return null;
    }
}

export function formatDistance(km: number | null): string | null {
    if (km === null || km === undefined) return null;
    return km < 1 ? `a ${Math.round(km * 1000)} m` : `a ${km.toFixed(1)} km`;
}
