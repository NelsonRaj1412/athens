// src/features/project/components/ProjectMapSelector.tsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { OpenStreetMapProvider, GeoSearchControl as GeoSearch } from 'leaflet-geosearch';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
/* Removed import of non-existent CSS file for react-leaflet-geosearch */

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export interface LocationData {
  position: [number, number];
  address: string;
}

interface ProjectMapSelectorProps {
  position: [number, number] | null;
  onLocationChange: (data: LocationData) => void;
}

const MapEventsHandler: React.FC<Omit<ProjectMapSelectorProps, 'position'>> = ({ onLocationChange }) => {
  const map = useMap();

  const isWithinIndia = (lat: number, lng: number) => {
    const bounds = { south: 6.5546, north: 35.6745, west: 68.1114, east: 97.3956 };
    return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await api.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = response.data;
      return data.display_name || `Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`;
    } catch (error) {
      return `Lat: ${lat.toFixed(4)}, Lon: ${lng.toFixed(4)}`;
    }
  };

  const handleLocationUpdate = async (latlng: L.LatLng) => {
    if (isWithinIndia(latlng.lat, latlng.lng)) {
      const address = await reverseGeocode(latlng.lat, latlng.lng);
      onLocationChange({
        position: [latlng.lat, latlng.lng],
        address: address,
      });
    } else {
    }
  };

  useMapEvents({
    click(e) {
      handleLocationUpdate(e.latlng);
    },
  });

  useEffect(() => {
    const layerKeys = Object.keys((map as any)._layers);
    const markerKey = layerKeys.find(key => (map as any)._layers[key] instanceof L.Marker);
    if(markerKey) {
      const marker = (map as any)._layers[markerKey];
      marker.on('dragend', (e: L.DragEndEvent) => {
          handleLocationUpdate(e.target.getLatLng());
      });
    }
  }, [map]);

  return null;
};

const SearchField: React.FC<Pick<ProjectMapSelectorProps, 'onLocationChange'>> = ({ onLocationChange }) => {
  return null;
};

const ProjectMapSelector: React.FC<ProjectMapSelectorProps> = ({ position, onLocationChange }) => {
  const initialCenter: [number, number] = [20.5937, 78.9629];

  const MapFlyEffect: React.FC<{ position: [number, number] | null }> = ({ position }) => {
      const map = useMap();
      useEffect(() => {
        if (position) {
          map.flyTo(position, 13);
        }
      }, [position, map]);
      return null;
  };

  return (
    <MapContainer
      center={position || initialCenter}
      zoom={position ? 13 : 5}
      maxZoom={19}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {position && <Marker position={position} draggable={true}></Marker>}
      <MapEventsHandler onLocationChange={onLocationChange} />
      <SearchField onLocationChange={onLocationChange} />
      <MapFlyEffect position={position} />
    </MapContainer>
  );
};

export default ProjectMapSelector;
