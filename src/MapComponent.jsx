import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import stationsDataStatic from './stations.json';

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
  const [stations, setStations] = useState(stationsDataStatic);
  const position = [45.7667, 9.7978]; // Albino, BG coordinates
  const zoomLevel = 11;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://www.centrometeolombardo.com/Moduli/refx.php?t=all');
        const text = await response.text();

        // Extract datostazione array from the JS response
        const datostazioneMatch = text.match(/var datostazione = (\[.*?\]);/s);
        if (datostazioneMatch) {
          // Note: using eval is generally risky, but here we're mimicking the original framework's behavior
          // for a prototype. A safer parser would be preferred for production.
          const liveData = eval(datostazioneMatch[1]);
          const coordsMatch = text.match(/var coords = (\[.*?\]);/s);
          const coordsData = coordsMatch ? eval(coordsMatch[1]) : [];

          const updatedStations = stationsDataStatic.map(staticStation => {
            // Find corresponding entry in live data
            const index = coordsData.findIndex(c => c[0] === staticStation.id);
            if (index !== -1 && liveData[index]) {
              const d = liveData[index];
              return {
                ...staticStation,
                weather: {
                  status: d[0],
                  date: d[2],
                  time: d[3],
                  currentTemp: parseFloat(d[4]),
                  maxTemp: parseFloat(d[5]),
                  minTemp: parseFloat(d[7]),
                  humidity: parseFloat(d[9]),
                  pressure: parseFloat(d[31]),
                  windSpeed: parseFloat(d[33]),
                  windDirection: d[34],
                  precipitationDay: parseFloat(d[39]),
                  precipitationYear: parseFloat(d[40])
                }
              };
            }
            return staticStation;
          });
          setStations(updatedStations);
        }
      } catch (error) {
        console.error('Error fetching live weather data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer center={position} zoom={zoomLevel} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      {stations.map((station) => {
        const temp = station.weather && station.weather.currentTemp !== null && !isNaN(station.weather.currentTemp) 
          ? Math.round(station.weather.currentTemp) 
          : '?';
        const icon = L.divIcon({
          className: 'temperature-marker',
          html: `<span>${temp}</span>`,
        });

        return (
          <Marker key={station.id} position={[station.latitude, station.longitude]} icon={icon}>
            <Popup>
              <h3>{station.name} ({station.province})</h3>
              {station.weather && station.weather.currentTemp !== undefined ? (
                <div>
                  <p>Last Update: {station.weather.date} {station.weather.time}</p>
                  <p>Temperature: {station.weather.currentTemp}°C</p>
                  <p>Humidity: {station.weather.humidity}%</p>
                  <p>Wind: {station.weather.windSpeed} km/h {station.weather.windDirection}</p>
                  <p>Pressure: {station.weather.pressure} hPa</p>
                  <p>Precipitation Today: {station.weather.precipitationDay} mm</p>
                </div>
              ) : (
                <p>No weather data available.</p>
              )}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;
