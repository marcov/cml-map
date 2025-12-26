import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import stationsData from './stations.json';

// Fix for default marker icon not appearing
import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const MapComponent = () => {
  const position = [45.6960, 9.6672]; // Bergamo, Italy coordinates
  const zoomLevel = 10;

  return (
    <MapContainer center={position} zoom={zoomLevel} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      {stationsData.map((station) => {
        const temp = station.weather && station.weather.currentTemp !== null ? Math.round(station.weather.currentTemp) : '?';
        const icon = L.divIcon({
          className: 'temperature-marker',
          html: `<span>${temp}</span>`,
        });

        return (
          <Marker key={station.id} position={[station.latitude, station.longitude]} icon={icon}>
            <Popup>
              <h3>{station.name} ({station.province})</h3>
              {station.weather && (
                <div>
                  <p>Last Update: {station.weather.date} {station.weather.time}</p>
                  <p>Temperature: {station.weather.currentTemp}°C</p>
                  <p>Humidity: {station.weather.humidity}%</p>
                  <p>Wind: {station.weather.windSpeed} km/h {station.weather.windDirection}</p>
                  <p>Pressure: {station.weather.pressure} hPa</p>
                  <p>Precipitation Today: {station.weather.precipitationDay} mm</p>
                </div>
              )}
              {!station.weather && <p>No weather data available.</p>}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;
