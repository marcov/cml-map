import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [stations, setStations] = useState([]);
  const position = [45.7667, 9.7978]; // Albino, BG coordinates
  const zoomLevel = 11;

  // Conversion factors from pixel coordinates to lat/lon (refined)
  const a = -0.0005858;
  const c = 46.7361;
  const b = 0.0008430;
  const d = 8.2705;

  useEffect(() => {
    const fetchData = async () => {
      console.info('Fetching live station data from CML...');
      try {
        const response = await fetch(`/api/Moduli/refx.php?t=all&r=${Date.now()}`);
        const text = await response.text();

        // Extract datostazione and coords arrays from the JS response
        const datostazioneMatch = text.match(/var datostazione = (\[.*?\]);/s);
        const coordsMatch = text.match(/var coords = (\[.*?\]);/s);

        if (datostazioneMatch && coordsMatch) {
          const liveData = eval(datostazioneMatch[1]);
          const coordsData = eval(coordsMatch[1]);

          const processedStations = coordsData.map((coordEntry, index) => {
            const stationId = coordEntry[0];
            const stationName = coordEntry[1];
            const province = coordEntry[2];
            const oldMapX = parseInt(coordEntry[3]);
            const oldMapY = parseInt(coordEntry[4]);

            // Filter out invalid stations
            if (oldMapX === -1 || oldMapY === -1 || (liveData[index] && liveData[index][0] === 'X')) {
              return null;
            }

            // Convert pixel coordinates to latitude and longitude
            const lat = a * oldMapY + c;
            const lng = b * oldMapX + d;

            const stationData = liveData[index];
            
            const weather = stationData ? {
              status: stationData[0],
              date: stationData[2],
              time: stationData[3],
              currentTemp: parseFloat(stationData[4]),
              maxTemp: parseFloat(stationData[5]),
              minTemp: parseFloat(stationData[7]),
              humidity: parseFloat(stationData[9]),
              pressure: parseFloat(stationData[31]),
              windSpeed: parseFloat(stationData[25]),
              windDirection: stationData[30],
              precipitationDay: parseFloat(stationData[37]),
              precipitationYear: parseFloat(stationData[40])
            } : null;

            return {
              id: stationId,
              name: stationName,
              province: province,
              latitude: lat,
              longitude: lng,
              weather: weather
            };
          }).filter(s => s !== null);

          setStations(processedStations);
          console.info(`Successfully updated ${processedStations.length} stations with live data.`);
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