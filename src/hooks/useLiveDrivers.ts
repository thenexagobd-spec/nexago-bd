/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { MAJOR_ROADS, CUSTOMERS, RESTAURANTS, LiveVeh } from '../components/LeafletMap';

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
const randDest = () => ['Customer', 'Restaurant', 'Base', 'Idle'][Math.floor(Math.random() * 4)];
const pairPick = () => {
  const r = RESTAURANTS[Math.floor(Math.random() * RESTAURANTS.length)];
  const c = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  return { rest: r, cust: c };
};
const roadStart = () => {
  const r = MAJOR_ROADS[Math.floor(Math.random() * MAJOR_ROADS.length)];
  const dir = Math.random() < 0.5 ? 1 : -1;
  const v = dir === 1 ? 0 : r.path.length - 1;
  return { road: r.name, path: r.path, vtx: v, dir };
};

export interface LiveDriversApi {
  liveDrivers: LiveDriverSim[];
  locSim: boolean;
  setLocSim: (v: boolean) => void;
  simTick: number;
}

/**
 * Shared live GPS driver simulation lifted from ZonesView so that both the
 * admin "Live Road Map" and the customer "Track Delivery" screens consume the
 * exact same real driver positions.
 */
export function useLiveDrivers(drivers: { id: string; name: string; status: string; vehicleType?: string; phone?: string }[]): LiveDriversApi {
  const [locSim, setLocSim] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('sd_locsim');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });
  const [simTick, setSimTick] = useState(0);

  const [liveDrivers, setLiveDrivers] = useState<LiveDriverSim[]>(() =>
    drivers.map(d => {
      const dest = randDest();
      const s = roadStart();
      const p = s.path[s.vtx];
      const pr = pairPick();
      return {
        ...d,
        lx: 60 + Math.random() * 300,
        ly: 40 + Math.random() * 220,
        tx: 60 + Math.random() * 300,
        ty: 40 + Math.random() * 220,
        lat: p[0], lng: p[1], tLat: p[0], tLng: p[1],
        roadName: s.road, path: s.path, vtx: s.vtx, dir: s.dir,
        restLat: pr.rest.lat, restLng: pr.rest.lng, restName: pr.rest.name,
        custLat: pr.cust.lat, custLng: pr.cust.lng, custName: pr.cust.name,
        dest,
        speed: 25 + Math.random() * 40,
        progress: 0,
      };
    })
  );

  const tickRef = useRef(0);
  useEffect(() => {
    if (!locSim) return;
    const t = setInterval(() => {
      setLiveDrivers(prev => prev.map(d => {
        const np = d.path ? d.path.length : 0;
        if (!np) {
          const s = roadStart();
          const pr = pairPick();
          return { ...d, path: s.path, vtx: s.vtx, dir: s.dir, roadName: s.road, lat: s.path[s.vtx][0], lng: s.path[s.vtx][1], tLat: s.path[s.vtx][0], tLng: s.path[s.vtx][1], dest: randDest(), restLat: pr.rest.lat, restLng: pr.rest.lng, restName: pr.rest.name, custLat: pr.cust.lat, custLng: pr.cust.lng, custName: pr.cust.name };
        }
        const cur = d.path[d.vtx];
        const nxt = d.path[d.vtx + d.dir];
        if (!nxt) {
          const s = roadStart();
          const pr = pairPick();
          return { ...d, path: s.path, vtx: s.vtx, dir: s.dir, roadName: s.road, lat: s.path[s.vtx][0], lng: s.path[s.vtx][1], tLat: s.path[s.vtx][0], tLng: s.path[s.vtx][1], dest: randDest(), restLat: pr.rest.lat, restLng: pr.rest.lng, restName: pr.rest.name, custLat: pr.cust.lat, custLng: pr.cust.lng, custName: pr.cust.name };
        }
        const dLat = nxt[0] - d.lat, dLng = nxt[1] - d.lng;
        const dd = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dd < 0.00006) {
          return { ...d, lat: nxt[0], lng: nxt[1], vtx: d.vtx + d.dir, tLat: nxt[0], tLng: nxt[1], speed: d.dest === 'Idle' ? 0 : 20 + Math.random() * 45 };
        }
        const step = Math.min(0.000022, dd);
        const f = step / dd;
        return { ...d, lat: d.lat + dLat * f, lng: d.lng + dLng * f, tLat: nxt[0], tLng: nxt[1], speed: d.dest === 'Idle' ? 0 : 20 + Math.random() * 45, progress: d.progress + step };
      }));
      tickRef.current += 1;
      setSimTick(tickRef.current);
    }, 300);
    return () => clearInterval(t);
  }, [locSim]);

  return { liveDrivers, locSim, setLocSim, simTick };
}
