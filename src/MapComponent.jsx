import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
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

  /**
   * Coordinate conversion constants (Pixel -> Lat/Lon)
   * Formula:
   * Latitude  = (a * pixelY) + c
   * Longitude = (b * pixelX) + d
   * 
   * Tweaking Positioning:
   * - To move ALL stations North (up): Increase 'c'
   * - To move ALL stations East (right): Increase 'd'
   * 
   * Tweaking Scale (Stretching):
   * - Vertical stretch: Make 'a' more negative (e.g. -0.00058 -> -0.00060)
   * - Horizontal stretch: Increase 'b' (e.g. 0.00084 -> 0.00090)
   */
  const a = -0.0005858;
  const c = 46.7361;
  const b = 0.0008430;
    const d = 8.2705;
  
    const scala_colori = ['#eceeff','#e2e4ff','#c9d1ff','#aeceff','#96c7ff','#63d4fe','#1ae6fe','#00f8ec','#00ffb2','#23ff80','#74fc23','#a2ff00','#c6ff00','#eaff00','#fefe00','#fff000','#fdd82a','#ffc926','#ffb016','#ff9b15','#fe8839','#ff6c6c','#ff65aa','#f659dc','#ec50ff'];
  
    // Parse the specific JS array format from CML
    const parseJSArray = (jsString) => {
      try {
        // 1. Replace single-quoted strings with double-quoted strings
        // 2. Handle escaped single quotes within those strings
        // 3. Ensure double quotes already present in strings are escaped
        const jsonValid = jsString.replace(/'((?:[^'\\]|\\.)*)'/g, (match, p1) => {
          return '"' + p1.replace(/"/g, '\\"').replace(/\\'/g, "'") + '"';
        });
        return JSON.parse(jsonValid);
      } catch (e) {
        console.error('Failed to parse station data string:', e);
        return [];
      }
    };
  
    const getTemperatureColor = (temp, meanTemp) => {
      if (temp === null || isNaN(temp) || meanTemp === null) return '#3388ff';
      
      const bar_zeroval = Math.round(meanTemp) - 12;
      // For temperature, the steps are 1 degree each
      let col_idx = 0;
      const val = temp;
      
      // Equivalent logic to GetBarStepValue and GetColorIdx for TEMP
      for (let i = 1; i < 25; i++) {
        if (val >= (bar_zeroval + i)) {
          col_idx = i;
        }
      }
      
      return scala_colori[col_idx] || scala_colori[scala_colori.length - 1];
    };
  
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
            const liveData = parseJSArray(datostazioneMatch[1]);
            const coordsData = parseJSArray(coordsMatch[1]);
  
            // Calculate mean temperature for coloring logic
            let totalTemp = 0;
            let count = 0;
            liveData.forEach(d => {
              if (d[0] === '0' && d[4] !== '' && !isNaN(parseFloat(d[4]))) {
                totalTemp += parseFloat(d[4]);
                count++;
              }
            });
            
            const rawMean = count > 0 ? totalTemp / count : null;
            
            // Refined mean logic from framework.js
            let filteredTotalTemp = 0;
            let filteredCount = 0;
            if (rawMean !== null) {
              liveData.forEach(d => {
                if (d[0] === '0' && d[4] !== '' && !isNaN(parseFloat(d[4]))) {
                  const val = parseFloat(d[4]);
                  if (Math.abs(val - rawMean) < 10) {
                    filteredTotalTemp += val;
                    filteredCount++;
                  }
                }
              });
            }
            
            const meanTemp = filteredCount > 0 ? filteredTotalTemp / filteredCount : rawMean;
  
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
                maxTempTime: stationData[6],
                minTemp: parseFloat(stationData[7]),
                minTempTime: stationData[8],
                humidity: parseFloat(stationData[9]),
                dewPoint: parseFloat(stationData[14]),
                pressure: parseFloat(stationData[31]),
                windSpeed: parseFloat(stationData[25]),
                maxWindSpeed: parseFloat(stationData[26]),
                maxWindSpeedTime: stationData[27],
                windDirection: stationData[30],
                precipitationDay: parseFloat(stationData[37]),
                precipitationYear: parseFloat(stationData[40]),
                rainRate: parseFloat(stationData[41]),
                maxRainRate: parseFloat(stationData[42])
              } : null;
  
              return {
                id: stationId,
                name: stationName,
                province: province,
                altitude: coordEntry[6], // Altitude from coords array
                latitude: lat,
                longitude: lng,
                weather: weather,
                color: getTemperatureColor(weather ? weather.currentTemp : null, meanTemp)
              };
            }).filter(s => s !== null);
  
            setStations(processedStations);
            console.info(`Successfully updated ${processedStations.length} stations with live data. Mean Temp: ${meanTemp ? meanTemp.toFixed(1) : 'N/A'}°C`);
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
        <MarkerClusterGroup 
        chunkedLoading 
        maxClusterRadius={25} 
        disableClusteringAtZoom={13}
        spiderfyOnMaxZoom={true}
      >
          {stations.map((station) => {
            const temp = station.weather && station.weather.currentTemp !== null && !isNaN(station.weather.currentTemp) 
              ? Math.round(station.weather.currentTemp) 
              : '?';
            const icon = L.divIcon({
              className: 'temperature-marker',
              html: `<span style="border-color: ${station.color}">${temp}</span>`,
            });
          return (
            <Marker key={station.id} position={[station.latitude, station.longitude]} icon={icon}>
              <Popup>
                <div className="station-popup">
                  <h3>{station.name} ({station.province})</h3>
                  {station.altitude && <p><strong>Altitude:</strong> {station.altitude} m</p>}

                  {station.weather && station.weather.currentTemp !== undefined ? (
                    <div className="weather-details">
                      <p className="last-update">Last Update: {station.weather.date} {station.weather.time}</p>
                      <hr />
                      <p><strong>Temperature:</strong> {station.weather.currentTemp}°C</p>
                      <p className="min-max">
                        <span className="max">Max: {station.weather.maxTemp}°C ({station.weather.maxTempTime})</span><br />
                        <span className="min">Min: {station.weather.minTemp}°C ({station.weather.minTempTime})</span>
                      </p>
                      <p><strong>Humidity:</strong> {station.weather.humidity}%</p>
                      <p><strong>Dew Point:</strong> {station.weather.dewPoint}°C</p>
                      <p><strong>Pressure:</strong> {station.weather.pressure} hPa</p>
                      <p><strong>Wind:</strong> {station.weather.windSpeed} km/h {station.weather.windDirection}</p>
                      {station.weather.maxWindSpeed > 0 && (
                        <p className="gust">Gust: {station.weather.maxWindSpeed} km/h ({station.weather.maxWindSpeedTime})</p>
                      )}
                      <hr />
                      <p><strong>Precipitation Today:</strong> {station.weather.precipitationDay} mm</p>
                      {station.weather.rainRate > 0 && (
                        <p><strong>Rain Rate:</strong> {station.weather.rainRate} mm/h (Max: {station.weather.maxRainRate})</p>
                      )}
                      <p><strong>Precipitation Year:</strong> {station.weather.precipitationYear} mm</p>
                    </div>
                  ) : (
                    <p>No weather data available.</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default MapComponent;
