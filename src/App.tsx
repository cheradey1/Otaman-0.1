import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MapComponent from './components/MapComponent';
import { PlannerConfig, Truck, Interceptor, Threat, InterceptorDrone, FormationShape } from './types';
import { Shield, Target, Clock, Zap, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const INTERCEPTORS: Record<string, Interceptor> = {
  'P1-Sun': { type: 'P1-Sun', speed: 400, range: 20000 },
  'Saliut': { type: 'Saliut', speed: 320, range: 15000 },
  'FPV interceptor': { type: 'FPV interceptor', speed: 150, range: 8000 },
};

export default function App() {
  const [config, setConfig] = useState<PlannerConfig>({
    city: 'Київ',
    truckCount: 4,
    interceptorType: 'P1-Sun',
    radius: 15000,
    innerRadius: 5000,
    threatType: 'shahed',
    dronesPerVehicle: 24,
    detectionDistance: 50,
    launchTime: 20,
    formationShape: 'plane',
  });

  const [emails, setEmails] = useState<string[]>(() => {
    const saved = localStorage.getItem("truckEmails");
    return saved ? JSON.parse(saved) : [];
  });

  const [cityCoords, setCityCoords] = useState<[number, number]>([50.4501, 30.5234]);
  const [cityRadius, setCityRadius] = useState(10000); // meters
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [drones, setDrones] = useState<InterceptorDrone[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [stats, setStats] = useState({
    totalDrones: 0,
    coverageArea: 0,
    reactionTime: 0,
    efficiency: 0,
    requiredTrucks: 0,
    isProtected: true,
  });

  const calculateStats = useCallback(() => {
    const interceptor = INTERCEPTORS[config.interceptorType];
    const threatSpeeds: Record<string, number> = { fpv: 120, shahed: 180, cruise: 850, ballistic: 5000 };
    const vThreat = threatSpeeds[config.threatType] || 200;
    const vDrone = interceptor.speed;
    const maxRange = interceptor.range / 1000; // km

    // T_threat = D_detect / V_threat
    const tThreat = config.detectionDistance / vThreat; // hours
    
    // R_intercept = min(V_drone * (T_threat - T_launch), MaxRange)
    const tLaunch = config.launchTime / 3600; // hours
    const rIntercept = Math.max(0, Math.min(vDrone * (tThreat - tLaunch), maxRange)); // km

    const totalDrones = config.truckCount * config.dronesPerVehicle;
    const perimeter = 2 * Math.PI * (cityRadius / 1000); // km
    const coveragePerTruck = 2 * rIntercept; // km
    const requiredTrucks = coveragePerTruck > 0 ? Math.ceil(perimeter / coveragePerTruck) : Infinity;
    
    const isProtected = config.truckCount >= requiredTrucks && rIntercept > 0;
    const efficiency = isProtected ? Math.min(99, 85 + (config.dronesPerVehicle / 5)) : Math.min(80, (config.truckCount / (requiredTrucks || 1)) * 80);

    setStats({
      totalDrones,
      coverageArea: Math.round(Math.PI * Math.pow(rIntercept, 2)),
      reactionTime: Number((config.launchTime / 60).toFixed(1)),
      efficiency: Math.round(efficiency),
      requiredTrucks: requiredTrucks === Infinity ? 0 : requiredTrucks,
      isProtected,
    });

    // Update config radius only if it differs significantly to avoid loops
    const newRadiusM = Math.max(1000, Math.round(rIntercept * 1000));
    const newInnerRadiusM = Math.max(500, Math.round(newRadiusM * 0.3)); // Inner is 30% of outer
    
    if (Math.abs(config.radius - newRadiusM) > 10 || Math.abs(config.innerRadius - newInnerRadiusM) > 10) {
      setConfig(prev => ({ ...prev, radius: newRadiusM, innerRadius: newInnerRadiusM }));
    }
  }, [config.interceptorType, config.threatType, config.detectionDistance, config.launchTime, config.truckCount, config.dronesPerVehicle, config.radius, config.innerRadius, cityRadius]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const handleCalculate = async () => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(config.city + ', Україна')}`);
      const data = await response.json();
      
      let center: [number, number] = cityCoords;
      if (data && data.length > 0) {
        const result = data[0];
        center = [parseFloat(result.lat), parseFloat(result.lon)];
        setCityCoords(center);

        // Estimate city radius from bounding box
        if (result.boundingbox) {
          const lat1 = parseFloat(result.boundingbox[0]);
          const lat2 = parseFloat(result.boundingbox[1]);
          const lon1 = parseFloat(result.boundingbox[2]);
          const lon2 = parseFloat(result.boundingbox[3]);
          
          const height = Math.abs(lat2 - lat1) * 111320;
          const width = Math.abs(lon2 - lon1) * 111320 * Math.cos(center[0] * Math.PI / 180);
          const area = height * width;
          const rCity = Math.sqrt(area / Math.PI);
          setCityRadius(rCity);
        }
      }

      const newTrucks: Truck[] = [];
      const R_EARTH = 6371000;

      for (let i = 0; i < config.truckCount; i++) {
        const angle = (2 * Math.PI * i) / config.truckCount;
        const dLat = (cityRadius * Math.cos(angle)) / R_EARTH;
        const dLon = (cityRadius * Math.sin(angle)) / (R_EARTH * Math.cos(Math.PI * center[0] / 180));
        const lat = center[0] + (dLat * 180 / Math.PI);
        const lon = center[1] + (dLon * 180 / Math.PI);

        newTrucks.push({
          id: i + 1,
          email: emails[i] || '',
          position: [lat, lon],
          status: 'idle',
        });
      }
      setTrucks(newTrucks);
    } catch (error) {
      console.error("Помилка розрахунку:", error);
    }
  };

  const handleSimulate = () => {
    if (isSimulating) {
      setIsSimulating(false);
      setThreats([]);
      setDrones([]);
      setTrucks(prev => prev.map(t => ({ ...t, status: 'idle', isLaunching: false, launchProgress: 0 })));
      return;
    }

    setIsSimulating(true);
    
    const speeds: Record<string, number> = { fpv: 120, shahed: 180, cruise: 850, ballistic: 5000 };
    const altitudes: Record<string, 'low' | 'high'> = { fpv: 'low', shahed: 'low', cruise: 'low', ballistic: 'high' };
    const difficulties: Record<string, 'low' | 'medium' | 'high' | 'very high'> = { 
      fpv: 'medium', shahed: 'low', cruise: 'high', ballistic: 'very high' 
    };

    const angle = Math.random() * Math.PI * 2;
    const mPerDegLat = 111320;
    const mPerDegLon = 111320 * Math.cos(cityCoords[0] * Math.PI / 180);
    
    // Spawn threat VERY close to the circle (entering it)
    const spawnDistLat = (config.radius * 1.05) / mPerDegLat;
    const spawnDistLon = (config.radius * 1.05) / mPerDegLon;
    
    const newThreat: Threat = {
      id: Math.random().toString(36).substr(2, 9),
      type: config.threatType,
      speed: speeds[config.threatType] || 200,
      altitude: altitudes[config.threatType] || 'low',
      difficulty: difficulties[config.threatType] || 'medium',
      position: [
        cityCoords[0] + Math.cos(angle) * spawnDistLat,
        cityCoords[1] + Math.sin(angle) * spawnDistLon
      ],
      target: cityCoords,
      status: 'detected',
    };

    setThreats([newThreat]);
    setDrones([]);
    setTrucks(prev => prev.map(t => ({ ...t, status: 'idle', isLaunching: false, launchProgress: 0 })));
  };

  useEffect(() => {
    if (!isSimulating || threats.length === 0) return;

    const interval = setInterval(() => {
      setThreats(prevThreats => {
        if (prevThreats.length === 0) return [];
        
        const t = prevThreats[0];
        const dx = t.target[0] - t.position[0];
        const dy = t.target[1] - t.position[1];
        
        const latMid = (t.position[0] + t.target[0]) / 2;
        const mPerDegLat = 111320;
        const mPerDegLon = 111320 * Math.cos(latMid * Math.PI / 180);
        
        const distM = Math.sqrt(
          Math.pow(dx * mPerDegLat, 2) + 
          Math.pow(dy * mPerDegLon, 2)
        );
        
        if (distM < 50) {
          setIsSimulating(false);
          setDrones([]);
          alert("ОБОРОНУ ПРОРВАНО! Ціль досягла центру міста.");
          return [];
        }

        // Check if reached inner radius (Critical zone)
        if (distM < config.innerRadius && t.status !== 'neutralized') {
          // If it reaches inner radius, it's a critical failure if not intercepted
          // We can visually show this or just keep simulating
        }

        const stepM = (t.speed / 3.6) * 0.05;
        const ratio = stepM / distM;
        const newPos: [number, number] = [
          t.position[0] + dx * ratio,
          t.position[1] + dy * ratio
        ];
        
        const isEntering = distM <= config.radius;
        const newStatus = isEntering ? 'intercepting' : t.status;

        // Launch drones if entering and not already launched
        if (isEntering && trucks.length > 0) {
          // Find NEAREST truck to the threat
          let nearestTruck = trucks[0];
          let minDist = Infinity;
          
          trucks.forEach(truck => {
            const tdx = t.position[0] - truck.position[0];
            const tdy = t.position[1] - truck.position[1];
            const d = Math.sqrt(Math.pow(tdx * mPerDegLat, 2) + Math.pow(tdy * mPerDegLon, 2));
            if (d < minDist) {
              minDist = d;
              nearestTruck = truck;
            }
          });

          // Start sequential launch from the nearest truck
          setTrucks(prev => prev.map(tr => {
            if (tr.id === nearestTruck.id && tr.status === 'idle') {
              return { ...tr, status: 'active', isLaunching: true, launchProgress: 0 };
            }
            return tr;
          }));
        }

        return [{ ...t, position: newPos, status: newStatus as any }];
      });

      // Handle sequential launch and drone movement
      const launchingTruck = trucks.find(t => t.isLaunching);
      if (launchingTruck && (launchingTruck.launchProgress || 0) < config.dronesPerVehicle) {
        const droneIndex = launchingTruck.launchProgress || 0;
        const interceptor = INTERCEPTORS[config.interceptorType];
        
        // Formation logic: 2m spacing
        const spacingM = 2;
        
        // Determine formation shape based on threat type if not explicitly set
        let shape: FormationShape = config.formationShape;
        if (threats[0]) {
          if (threats[0].type === 'cruise' || threats[0].type === 'shahed') shape = 'plane';
          else if (threats[0].type === 'fpv') shape = 'sphere';
          else if (threats[0].type === 'ballistic') shape = 'cone';
          else shape = 'grid';
        }

        let offset = { x: 0, y: 0, z: 0 };
        
        if (shape === 'plane') {
          const col = droneIndex % 6;
          const row = Math.floor(droneIndex / 6);
          offset = { x: (col - 2.5) * spacingM, y: 0, z: (row - 2) * spacingM };
        } else if (shape === 'sphere') {
          const phi = Math.acos(1 - 2 * (droneIndex + 0.5) / config.dronesPerVehicle);
          const theta = Math.PI * (1 + Math.sqrt(5)) * (droneIndex + 0.5);
          const r = spacingM * 2;
          offset = {
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi)
          };
        } else if (shape === 'cylinder') {
          const angle = (droneIndex % 8) * (Math.PI * 2 / 8);
          const level = Math.floor(droneIndex / 8);
          const r = spacingM * 2;
          offset = {
            x: r * Math.cos(angle),
            y: r * Math.sin(angle),
            z: (level - 1) * spacingM
          };
        } else if (shape === 'cone') {
          const angle = (droneIndex / 8) * Math.PI * 2;
          const level = Math.floor(droneIndex / 8);
          const r = level * spacingM;
          offset = {
            x: r * Math.cos(angle),
            y: -level * spacingM,
            z: r * Math.sin(angle)
          };
        } else if (shape === 'v-shape') {
          const side = droneIndex % 2 === 0 ? 1 : -1;
          const idx = Math.floor(droneIndex / 2);
          offset = { x: side * idx * spacingM, y: -idx * spacingM, z: 0 };
        } else if (shape === 'ring') {
          const angle = (droneIndex / config.dronesPerVehicle) * Math.PI * 2;
          const r = spacingM * 4;
          offset = { x: r * Math.cos(angle), y: r * Math.sin(angle), z: 0 };
        } else {
          // 3D Grid
          const side = Math.ceil(Math.pow(config.dronesPerVehicle, 1/3));
          const x = droneIndex % side;
          const y = Math.floor((droneIndex / side) % side);
          const z = Math.floor(droneIndex / (side * side));
          offset = { 
            x: (x - side/2) * spacingM, 
            y: (y - side/2) * spacingM, 
            z: (z - side/2) * spacingM 
          };
        }

        // Altitude based on threat type
        const threatAltitudes: Record<string, number> = { fpv: 100, shahed: 150, cruise: 50, ballistic: 5000 };
        const targetAlt = threatAltitudes[config.threatType] || 100;

        const newDrone: InterceptorDrone = {
          id: `drone-${launchingTruck.id}-${droneIndex}-${Math.random().toString(36).substr(2, 5)}`,
          truckId: launchingTruck.id,
          position: [launchingTruck.position[0], launchingTruck.position[1]],
          target: [threats[0].position[0], threats[0].position[1]],
          speed: interceptor.speed,
          altitude: targetAlt + offset.z,
          status: 'intercepting',
          isMotherDrone: droneIndex === 0,
          offset: offset
        };

        setDrones(prev => [...prev, newDrone]);
        
        const nextProgress = (launchingTruck.launchProgress || 0) + 1;
        const isDoneLaunching = nextProgress >= config.dronesPerVehicle;

        setTrucks(prev => prev.map(t => 
          t.id === launchingTruck.id 
            ? { ...t, launchProgress: nextProgress, isLaunching: !isDoneLaunching } 
            : t
        ));
      }

      // Move drones
      setDrones(prevDrones => {
        if (prevDrones.length === 0) {
          // If no drones left and we were in 'returning' state, set trucks to idle
          setTrucks(prev => prev.map(t => t.status === 'returning' ? { ...t, status: 'idle' } : t));
          return prevDrones;
        }
        
        const threat = threats[0];
        
        // If no threat, drones should return
        if (!threat) {
          const updatedDrones = prevDrones.map(d => {
            const truck = trucks.find(t => t.id === d.truckId);
            if (!truck) return d;
            
            const dx = truck.position[0] - d.position[0];
            const dy = truck.position[1] - d.position[1];
            const latMid = (d.position[0] + truck.position[0]) / 2;
            const mPerDegLat = 111320;
            const mPerDegLon = 111320 * Math.cos(latMid * Math.PI / 180);
            const distM = Math.sqrt(Math.pow(dx * mPerDegLat, 2) + Math.pow(dy * mPerDegLon, 2));

            if (distM < 10) {
              return { ...d, status: 'returning' as const, position: truck.position };
            }

            const stepM = (d.speed / 3.6) * 0.05;
            const ratio = stepM / distM;
            return {
              ...d,
              status: 'returning' as const,
              position: [
                d.position[0] + dx * ratio,
                d.position[1] + dy * ratio
              ] as [number, number]
            };
          }).filter(d => {
            const truck = trucks.find(t => t.id === d.truckId);
            if (!truck) return true;
            const dx = truck.position[0] - d.position[0];
            const dy = truck.position[1] - d.position[1];
            // If very close to truck, remove it
            return Math.abs(dx) > 0.00001 || Math.abs(dy) > 0.00001;
          });

          // If all drones for a truck are gone, set that truck to idle
          const remainingTruckIds = new Set(updatedDrones.map(d => d.truckId));
          setTrucks(prev => prev.map(t => 
            t.status === 'returning' && !remainingTruckIds.has(t.id) 
              ? { ...t, status: 'idle' } 
              : t
          ));

          return updatedDrones;
        }

        // Lead Pursuit Calculation (Intercept Point)
        const motherDrone = prevDrones.find(dr => dr.isMotherDrone);
        const refPos = motherDrone ? motherDrone.position : prevDrones[0].position;
        
        // Direction of threat
        const dx_t = threat.target[0] - threat.position[0];
        const dy_t = threat.target[1] - threat.position[1];
        const distToCity = Math.sqrt(dx_t * dx_t + dy_t * dy_t);
        
        // Threat velocity vector in degrees per second (approx)
        const latMid = (refPos[0] + threat.position[0]) / 2;
        const mPerDegLat = 111320;
        const mPerDegLon = 111320 * Math.cos(latMid * Math.PI / 180);
        
        const threatSpeedMS = threat.speed / 3.6;
        const vx_t = (threatSpeedMS * (dx_t / distToCity)) / mPerDegLat;
        const vy_t = (threatSpeedMS * (dy_t / distToCity)) / mPerDegLon;

        // Distance between drone swarm center and threat
        const dx_dt = threat.position[0] - refPos[0];
        const dy_dt = threat.position[1] - refPos[1];
        const distM = Math.sqrt(
          Math.pow(dx_dt * mPerDegLat, 2) + 
          Math.pow(dy_dt * mPerDegLon, 2)
        );
        
        // Time to intercept (Distance / Relative Speed)
        // For simplicity, we use drone speed as dominant
        const droneSpeedMS = prevDrones[0].speed / 3.6;
        const timeToIntercept = distM / droneSpeedMS;
        
        // Predicted Intercept Point
        const interceptPoint: [number, number] = [
          threat.position[0] + vx_t * timeToIntercept,
          threat.position[1] + vy_t * timeToIntercept
        ];
        
        return prevDrones.map(d => {
          // Formation target relative to intercept point
          const targetLat = interceptPoint[0] + (d.offset.y / mPerDegLat);
          const targetLon = interceptPoint[1] + (d.offset.x / mPerDegLon);
          
          const dx = targetLat - d.position[0];
          const dy = targetLon - d.position[1];
          
          const dM = Math.sqrt(
            Math.pow(dx * mPerDegLat, 2) + 
            Math.pow(dy * mPerDegLon, 2)
          );

          if (dM < 10) {
            // Interception successful!
            setThreats([]);
            setTrucks(prev => prev.map(t => t.id === d.truckId ? { ...t, status: 'returning' } : t));
            return { ...d, status: 'returning' as const };
          }

          const stepM = (d.speed / 3.6) * 0.05;
          const ratio = stepM / dM;
          
          return {
            ...d,
            position: [
              d.position[0] + dx * ratio,
              d.position[1] + dy * ratio
            ] as [number, number],
            target: [targetLat, targetLon]
          };
        });
      });

    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating, threats, drones.length, trucks, config.radius, config.interceptorType, config.dronesPerVehicle]);

  const handleSend = async () => {
    if (trucks.length === 0) {
      alert("Спочатку виконайте розрахунок!");
      return;
    }
    const validEmails = emails.filter(e => e.includes('@'));
    if (validEmails.length === 0) {
      alert("Введіть хоча б один коректний email!");
      return;
    }

    try {
      const response = await fetch("/api/send-coordinates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trucks }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Координати надіслано ${data.results.length} водіям!`);
      } else if (data.mock) {
        alert("Email сервіс не налаштований (RESEND_API_KEY). Координати виведено в консоль.");
        console.log("Truck Coordinates:", trucks);
      } else {
        throw new Error(data.error || "Failed to send");
      }
    } catch (error) {
      console.error("Error sending coordinates:", error);
      alert("Помилка при відправці координат. Перевірте консоль.");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-background text-white overflow-hidden font-sans selection:bg-accent selection:text-white">
      <Sidebar 
        config={config} 
        setConfig={setConfig} 
        emails={emails}
        setEmails={setEmails}
        onCalculate={handleCalculate}
        onSend={handleSend}
        onSimulate={handleSimulate}
        isSimulating={isSimulating}
      />
      
      <main className="flex-1 relative flex flex-col">
        {/* Header Stats */}
        <div className="absolute top-6 left-6 right-6 z-10 flex gap-4 pointer-events-none">
          <StatCard icon={<Shield className="w-4 h-4 text-accent" />} label="Всього дронів" value={stats.totalDrones} />
          <StatCard icon={<Target className="w-4 h-4 text-accent" />} label="Потрібно машин" value={stats.requiredTrucks} />
          <StatCard icon={<Clock className="w-4 h-4 text-accent" />} label="Час реакції" value={`${stats.reactionTime} хв`} />
          <StatCard 
            icon={<Zap className={`w-4 h-4 ${stats.isProtected ? 'text-green-500' : 'text-red-500'}`} />} 
            label="Статус оборони" 
            value={stats.isProtected ? 'ЗАХИЩЕНО' : 'НЕБЕЗПЕКА'} 
          />
        </div>

        <div className="flex-1 relative">
          <MapComponent 
            center={cityCoords} 
            radius={config.radius} 
            innerRadius={config.innerRadius}
            trucks={trucks}
            threats={threats}
            drones={drones}
          />

          {/* Simulation Overlay */}
          <AnimatePresence>
            {isSimulating && threats.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute top-24 right-6 z-10 w-72 custom-panel p-4 border border-red-500/30 bg-red-500/5"
              >
                <div className="flex items-center gap-2 text-red-500 mb-4">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                  <span className="font-bold text-sm uppercase tracking-tighter">Ціль виявлена!</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Тип</span>
                    <span className="text-xs font-bold uppercase text-accent">{threats[0].type}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Швидкість</span>
                    <span className="text-xs font-bold">{threats[0].speed} км/год</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Висота</span>
                    <span className="text-xs font-bold uppercase">{threats[0].altitude === 'low' ? 'Низька' : 'Висока'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/40 uppercase font-mono">Складність</span>
                    <span className="text-xs font-bold uppercase text-red-400">{threats[0].difficulty}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 z-10 custom-panel p-4 border border-white/10 flex flex-col gap-2 text-[10px] font-mono uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span>Центр оборони</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Мобільна одиниця</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Загроза</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border border-accent bg-accent/10" />
            <span>Зона перехоплення</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="custom-panel px-6 py-3 border border-white/10 flex items-center gap-4 min-w-[160px] pointer-events-auto hover:border-accent/50 transition-colors text-white">
      <div className="p-2 bg-white/5 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono leading-none mb-1">{label}</p>
        <p className="text-lg font-bold tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
}
