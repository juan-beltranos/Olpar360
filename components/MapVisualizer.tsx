import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
  lat: number;
  lng: number;
  label?: string;
}

interface MapProps {
  locations: Location[];
  center?: [number, number];
  onMarkerDragEnd?: (index: number, lat: number, lng: number) => void;
  showUserLocation?: boolean; // New Prop
}

const RecenterMap = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

interface DraggableMarkerProps {
    position: [number, number];
    label?: string;
    onDragEnd: (lat: number, lng: number) => void;
}

const DraggableMarker: React.FC<DraggableMarkerProps> = ({ 
    position, 
    label, 
    onDragEnd 
}) => {
    const markerRef = useRef<L.Marker>(null)
    const eventHandlers = useMemo(
      () => ({
        dragend() {
          const marker = markerRef.current
          if (marker != null) {
             const { lat, lng } = marker.getLatLng();
             onDragEnd(lat, lng);
          }
        },
      }),
      [onDragEnd],
    )
  
    return (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={position}
        ref={markerRef}>
        <Popup minWidth={90}>
          {typeof label === 'string' ? label : "Ubicación"}
        </Popup>
      </Marker>
    )
}

// Component to handle User Location Logic inside MapContainer context
const UserLocationMarker = () => {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const map = useMap();

    useEffect(() => {
        map.locate().on("locationfound", function (e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
            // Optional: Fly to user location on first load
            // map.flyTo(e.latlng, map.getZoom());
        });
    }, [map]);

    return position === null ? null : (
        <CircleMarker 
            center={position} 
            pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }} 
            radius={8}
        >
            <Popup>Tú estás aquí</Popup>
        </CircleMarker>
    );
}

export const MapVisualizer: React.FC<MapProps> = ({ locations, center, onMarkerDragEnd, showUserLocation }) => {
  const defaultCenter: [number, number] = [4.6097, -74.0817]; // Bogota default
  const activeCenter = useMemo<[number, number]>(() => {
    if (center) return center;
    if (locations.length > 0) return [locations[0].lat, locations[0].lng];
    return defaultCenter;
  }, [center, locations]);


  return (
    <div className="h-full w-full rounded-lg overflow-hidden shadow-inner border border-slate-700 relative z-0">
      <MapContainer 
        center={activeCenter} 
        zoom={15} 
        scrollWheelZoom={true} 
        dragging={true}
        doubleClickZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        <RecenterMap center={activeCenter} />
        
        {showUserLocation && <UserLocationMarker />}

        {locations.map((loc, idx) => (
            <DraggableMarker 
                key={idx}
                position={[loc.lat, loc.lng]}
                label={loc.label}
                onDragEnd={(lat, lng) => onMarkerDragEnd && onMarkerDragEnd(idx, lat, lng)}
            />
        ))}
      </MapContainer>
    </div>
  );
};