import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, Threat, InterceptorDrone } from '../types';

// Fix for default marker icons in Leaflet with React
const icon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for defense units
const defenseIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #22c55e; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(34, 197, 94, 0.6);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const centerIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #f27d26; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px rgba(242, 125, 38, 0.8);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const threatIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); animation: pulse 0.5s infinite;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const droneIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #4ade80; width: 6px; height: 6px; border-radius: 50%; border: 1px solid white; box-shadow: 0 0 5px rgba(74, 222, 128, 0.8);"></div>`,
  iconSize: [6, 6],
  iconAnchor: [3, 3]
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface Props {
  center: [number, number];
  radius: number;
  innerRadius: number;
  trucks: Truck[];
  threats: Threat[];
  drones: InterceptorDrone[];
}

export default function MapComponent({ center, radius, innerRadius, trucks, threats, drones }: Props) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) return <div className="w-full h-full bg-background animate-pulse" />;

  return (
    <MapContainer 
      center={center} 
      zoom={11} 
      style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      
      <MapUpdater center={center} />

      {/* Defense Center */}
      <Marker position={center} icon={centerIcon}>
        <Popup className="custom-popup">
          <div className="font-mono text-xs uppercase tracking-widest font-bold">Центр оборони</div>
        </Popup>
      </Marker>

      {/* Defense Circles */}
      <Circle 
        center={center} 
        radius={radius} 
        pathOptions={{ 
          color: threats.some(t => t.status === 'intercepting') ? '#ef4444' : '#f27d26', 
          fillColor: threats.some(t => t.status === 'intercepting') ? '#ef4444' : '#f27d26', 
          fillOpacity: 0.05,
          weight: 1,
          dashArray: '5, 10'
        }} 
      />
      
      <Circle 
        center={center} 
        radius={innerRadius} 
        pathOptions={{ 
          color: '#ef4444', 
          fillColor: '#ef4444', 
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '0'
        }} 
      />

      {/* Truck Markers */}
      {trucks.map((truck) => (
        <Marker 
          key={truck.id} 
          position={truck.position} 
          icon={new L.DivIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${
              truck.status === 'active' || truck.status === 'returning' ? '#d946ef' : '#22c55e'
            }; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${
              truck.status === 'active' || truck.status === 'returning' ? 'rgba(217, 70, 239, 0.8)' : 'rgba(34, 197, 94, 0.6)'
            }; ${truck.isLaunching ? 'animation: pulse 1s infinite;' : ''}"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })}
        >
          <Popup className="custom-popup">
            <div className="font-mono text-[10px] uppercase tracking-widest">
              <p className="font-bold text-accent mb-1">Машина #{truck.id}</p>
              <p className="text-white/60">{truck.email || 'Email не вказано'}</p>
              <p className="mt-1">Статус: <span className={truck.status === 'active' ? 'text-pink-400' : truck.status === 'returning' ? 'text-blue-400' : 'text-green-400'}>{truck.status}</span></p>
              {truck.isLaunching && <p className="text-red-500 animate-pulse mt-1">ЗАПУСК: {truck.launchProgress} дронів</p>}
              <p className="mt-1 text-[8px] opacity-50">{truck.position[0].toFixed(4)}, {truck.position[1].toFixed(4)}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Threat Markers */}
      {threats.map((threat) => (
        <Marker 
          key={threat.id} 
          position={threat.position} 
          icon={threatIcon}
        >
          <Popup className="custom-popup">
            <div className="font-mono text-[10px] uppercase tracking-widest">
              <p className="font-bold text-red-500 mb-1">Загроза: {threat.type}</p>
              <p>Швидкість: {threat.speed} км/год</p>
              <p>Висота: {threat.altitude === 'low' ? 'НИЗЬКА' : 'ВИСОКА'}</p>
              <p>Статус: {threat.status === 'detected' ? 'ВИЯВЛЕНО' : 'ПЕРЕХОПЛЕННЯ'}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Mother Drone Guidance Line */}
      {drones.find(d => d.isMotherDrone && d.status === 'intercepting') && threats[0] && (
        <Polyline 
          positions={[
            drones.find(d => d.isMotherDrone)!.position,
            threats[0].position
          ]}
          pathOptions={{ color: '#f27d26', weight: 1, dashArray: '5, 10', opacity: 0.5 }}
        />
      )}

      {/* Drone Markers */}
      {drones.map((drone) => (
        <Marker 
          key={drone.id} 
          position={drone.position} 
          icon={new L.DivIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${
              drone.status === 'returning' ? '#3b82f6' : (drone.isMotherDrone ? '#f27d26' : '#4ade80')
            }; width: ${drone.isMotherDrone ? '10px' : '6px'}; height: ${drone.isMotherDrone ? '10px' : '6px'}; border-radius: ${drone.isMotherDrone ? '2px' : '50%'}; border: 1px solid white; box-shadow: 0 0 8px ${
              drone.status === 'returning' ? 'rgba(59, 130, 246, 0.8)' : (drone.isMotherDrone ? 'rgba(242, 125, 38, 0.8)' : 'rgba(74, 222, 128, 0.8)')
            }; ${drone.isMotherDrone ? 'transform: rotate(45deg);' : ''}"></div>`,
            iconSize: [drone.isMotherDrone ? 10 : 6, drone.isMotherDrone ? 10 : 6],
            iconAnchor: [drone.isMotherDrone ? 5 : 3, drone.isMotherDrone ? 5 : 3]
          })}
          interactive={true}
        >
          <Popup className="custom-popup">
            <div className="font-mono text-[8px] uppercase tracking-widest">
              <p className="font-bold text-green-400">{drone.isMotherDrone ? 'ДРОН-МАТКА' : 'ПЕРЕХОПЛЮВАЧ'}</p>
              <p>Статус: {drone.status}</p>
              <p>Висота: {drone.altitude}м</p>
              <p>Швидкість: {drone.speed} км/год</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
