// Variante web: mapa Leaflet + OpenStreetMap imitando la API mínima de
// react-native-maps que usa la app (MapView con initialRegion y Markers
// con coordinate/title/description/pinColor/onCalloutPress).
// Leaflet se importa dinámicamente porque toca `window` al cargar y el
// render estático de Expo Router corre en Node.
import type * as Leaflet from 'leaflet';
import {
    Children,
    isValidElement,
    ReactNode,
    useEffect,
    useRef,
    useState,
} from 'react';
import { View } from 'react-native';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function ensureLeafletCss() {
    if (document.getElementById('leaflet-css')) return;
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
}

type Coordinate = { latitude: number; longitude: number };

type Region = Coordinate & { latitudeDelta: number; longitudeDelta: number };

type MarkerProps = {
    coordinate: Coordinate;
    title?: string;
    description?: string;
    pinColor?: string;
    onCalloutPress?: () => void;
};

// Solo transporta props: MapView lee sus children y dibuja los pines.
export function Marker(_props: MarkerProps) {
    return null;
}

export function MapView({
    style,
    initialRegion,
    children,
}: {
    style?: object;
    initialRegion: Region;
    children?: ReactNode;
}) {
    const divRef = useRef<HTMLDivElement | null>(null);
    const leafletRef = useRef<typeof Leaflet | null>(null);
    const mapRef = useRef<Leaflet.Map | null>(null);
    const layerRef = useRef<Leaflet.LayerGroup | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const L = await import('leaflet');
            if (cancelled || !divRef.current || mapRef.current) return;

            ensureLeafletCss();
            leafletRef.current = L;

            // latitudeDelta ≈ grados visibles → zoom equivalente.
            const zoom = Math.round(
                Math.log2(360 / (initialRegion.latitudeDelta || 0.02)),
            );
            const map = L.map(divRef.current).setView(
                [initialRegion.latitude, initialRegion.longitude],
                Math.min(Math.max(zoom, 3), 18),
            );
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            }).addTo(map);
            layerRef.current = L.layerGroup().addTo(map);
            mapRef.current = map;
            setReady(true);

            // El contenedor recién toma tamaño después del primer layout.
            setTimeout(() => map.invalidateSize(), 0);
        })();

        return () => {
            cancelled = true;
            mapRef.current?.remove();
            mapRef.current = null;
            layerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const L = leafletRef.current;
        const layer = layerRef.current;
        if (!L || !layer) return;

        layer.clearLayers();
        Children.forEach(children, (child) => {
            if (!isValidElement(child)) return;
            const { coordinate, title, description, pinColor, onCalloutPress } =
                child.props as MarkerProps;
            if (!coordinate) return;

            const marker = L.circleMarker(
                [coordinate.latitude, coordinate.longitude],
                {
                    radius: 9,
                    color: '#ffffff',
                    weight: 2,
                    fillColor: pinColor ?? '#e11d48',
                    fillOpacity: 1,
                },
            ).addTo(layer);

            const popup = document.createElement('div');
            popup.style.cursor = onCalloutPress ? 'pointer' : 'default';
            const strong = document.createElement('strong');
            strong.textContent = title ?? '';
            popup.appendChild(strong);
            if (description) {
                const desc = document.createElement('div');
                desc.textContent = description;
                popup.appendChild(desc);
            }
            if (onCalloutPress) {
                const hint = document.createElement('div');
                hint.textContent = 'Tocá acá para agregarla';
                hint.style.cssText =
                    'margin-top:6px;color:#059669;font-weight:600;';
                popup.appendChild(hint);
                popup.addEventListener('click', onCalloutPress);
            }
            marker.bindPopup(popup);
        });
    }, [children, ready]);

    return (
        <View style={style}>
            <div
                ref={divRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                }}
            />
        </View>
    );
}
