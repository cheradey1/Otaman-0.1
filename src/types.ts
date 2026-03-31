export interface Threat {
  id: string;
  type: 'shahed' | 'cruise' | 'fpv' | 'ballistic';
  speed: number; // km/h
  altitude: 'low' | 'high';
  difficulty: 'low' | 'medium' | 'high' | 'very high';
  position: [number, number];
  target: [number, number];
  status: 'detected' | 'intercepting' | 'neutralized';
}

export type FormationShape = 'plane' | 'sphere' | 'cylinder' | 'cone' | 'grid' | 'v-shape' | 'ring';

export interface Truck {
  id: number;
  email: string;
  position: [number, number];
  status: 'idle' | 'active' | 'returning';
  isLaunching?: boolean;
  launchProgress?: number;
}

export interface Interceptor {
  type: 'P1-Sun' | 'Saliut' | 'FPV interceptor';
  speed: number; // km/h
  range: number; // m
}

export interface InterceptorDrone {
  id: string;
  truckId: number;
  position: [number, number];
  target: [number, number];
  speed: number;
  status: 'launching' | 'intercepting' | 'returning';
  altitude: number; // meters
  isMotherDrone?: boolean;
  offset: { x: number; y: number; z: number }; // Relative to mother drone or formation center
}

export interface PlannerConfig {
  city: string;
  truckCount: number;
  interceptorType: 'P1-Sun' | 'Saliut' | 'FPV interceptor';
  radius: number; // meters (outer)
  innerRadius: number; // meters (critical)
  threatType: 'shahed' | 'cruise' | 'fpv' | 'ballistic';
  dronesPerVehicle: number;
  detectionDistance: number; // km
  launchTime: number; // seconds
  formationShape: FormationShape;
}

export interface AppData {
  city: string;
  center: [number, number];
  radius: number;
  trucks: Truck[];
  interceptor: Interceptor;
}
