/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { LiveVeh } from '../components/LeafletMap';

export type LiveDriverSim = LiveVeh & {
  lx: number;
  ly: number;
  tx: number;
  ty: number;
  path: [number, number][];
  vtx: number;
  dir: number;
  progress: number;
};
export interface LiveDriversApi {
  liveDrivers: LiveDriverSim[];
  locSim: boolean;
  setLocSim: (v: boolean) => void;
  simTick: number;
}

const hasRealLocation = (driver: any) => {
  const lat = Number(driver?.locationCoords?.lat);
  const lng = Number(driver?.locationCoords?.lng);
  return Boolean(driver?.lastLocationAt && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 0 && Math.abs(lng) > 0);
};

const toLiveDriver = (driver: any): LiveDriverSim => {
  const lat = Number(driver.locationCoords.lat);
  const lng = Number(driver.locationCoords.lng);
  return {
    ...driver,
    lx: 0,
    ly: 0,
    tx: 0,
    ty: 0,
    lat,
    lng,
    tLat: lat,
    tLng: lng,
    roadName: driver.roadName || 'Real GPS',
    path: [[lat, lng]],
    vtx: 0,
    dir: 1,
    dest: driver.status === 'On-Delivery' ? 'Customer' : 'Idle',
    speed: Number(driver.speed || 0),
    progress: 0,
  };
};

/**
 * Shared live GPS driver feed lifted from ZonesView so that both the
 * admin "Live Road Map" and the customer "Track Delivery" screens consume the
 * exact same real driver positions.
 */
export function useLiveDrivers(drivers: { id: string; name: string; status: string; vehicleType?: string; phone?: string; locationCoords?: { lat: number; lng: number }; lastLocationAt?: string; speed?: number; roadName?: string }[]): LiveDriversApi {
  const [locSim, setLocSim] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sd_locsim');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const [simTick, setSimTick] = useState(0);

  const [liveDrivers, setLiveDrivers] = useState<LiveDriverSim[]>(() =>
    drivers.filter(hasRealLocation).map(toLiveDriver)
  );

  useEffect(() => {
    setLiveDrivers(drivers.filter(hasRealLocation).map(toLiveDriver));
  }, [drivers]);

  const tickRef = useRef(0);
  useEffect(() => {
    if (!locSim) return;
    const t = setInterval(() => {
      setLiveDrivers(drivers.filter(hasRealLocation).map(toLiveDriver));
      tickRef.current += 1;
      setSimTick(tickRef.current);
    }, 3000);
    return () => clearInterval(t);
  }, [drivers, locSim]);

  return { liveDrivers, locSim, setLocSim, simTick };
}
