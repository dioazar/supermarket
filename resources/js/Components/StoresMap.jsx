import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

const emojiIcon = (emoji, size = 30) =>
    L.divIcon({
        html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">${emoji}</div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size],
    });

/**
 * Mapa OpenStreetMap con tu ubicación (📍), tus tiendas (🏪 verde)
 * y los negocios encontrados cerca (🛒), con botón para agregarlos.
 */
export default function StoresMap({ center, places, stores, onAdd, addedNames }) {
    return (
        <div className="mt-3 h-80 overflow-hidden rounded-xl">
            <MapContainer
                center={[center.lat, center.lng]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker
                    position={[center.lat, center.lng]}
                    icon={emojiIcon('📍', 34)}
                >
                    <Popup>Estás acá</Popup>
                </Marker>

                {stores
                    .filter((store) => store.lat && store.lng)
                    .map((store) => (
                        <Marker
                            key={`store-${store.id}`}
                            position={[store.lat, store.lng]}
                            icon={emojiIcon('🏪')}
                        >
                            <Popup>
                                <strong>{store.name}</strong>
                                <br />
                                Ya está en tus tiendas ✓
                            </Popup>
                        </Marker>
                    ))}

                {places.map((place) => {
                    const added = addedNames.includes(place.name);
                    return (
                        <Marker
                            key={`${place.source}-${place.external_id}`}
                            position={[place.lat, place.lng]}
                            icon={emojiIcon(added ? '✅' : '🛒', 26)}
                        >
                            <Popup>
                                <strong>{place.name}</strong>
                                {place.address && (
                                    <>
                                        <br />
                                        {place.address}
                                    </>
                                )}
                                <br />
                                {added ? (
                                    <em>Agregada ✓</em>
                                ) : (
                                    <button
                                        style={{
                                            marginTop: 6,
                                            background: '#059669',
                                            color: '#fff',
                                            border: 0,
                                            borderRadius: 8,
                                            padding: '4px 10px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => onAdd(place)}
                                    >
                                        + Agregar
                                    </button>
                                )}
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
