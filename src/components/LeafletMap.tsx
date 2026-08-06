import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const STYLE = `@keyframes nexPing{0%{transform:scale(0.7);opacity:1}100%{transform:scale(1.6);opacity:0}}.leaflet-container{font-family:inherit}.leaflet-tooltip.nexago-tip,.leaflet-tooltip.nexago-tip::before{background:#0f172a;border:1px solid #334155;color:#fff;border-radius:8px;font:600 11px/1.5 system-ui}`;
if (typeof document !== 'undefined' && !document.getElementById('nexago-leaflet-css')) {
  const el = document.createElement('style');
  el.id = 'nexago-leaflet-css';
  el.textContent = STYLE;
  document.head.appendChild(el);
}

export const MAJOR_ROADS: { name: string; path: [number, number][]; color: string }[] = [
  { name: 'Mirpur Road', path: [[23.778, 90.3786], [23.7825, 90.3833], [23.7898, 90.3946], [23.7936, 90.4045]], color: '#e2c14a' },
  { name: 'Airport Road', path: [[23.8103, 90.4138], [23.8252, 90.4159]], color: '#e2c14a' },
  { name: 'Progoti Sarani', path: [[23.7802, 90.4146], [23.8096, 90.4144], [23.8252, 90.4159], [23.8286, 90.4183]], color: '#e2c14a' },
  { name: 'Bijoy Sarani', path: [[23.7936, 90.4045], [23.7998, 90.4234]], color: '#e2c14a' },
  { name: 'Dilkusha Avenue', path: [[23.739, 90.4145], [23.7455, 90.4204], [23.755, 90.4215]], color: '#f0f0f0' },
  { name: 'Kazi Nazrul Islam Ave', path: [[23.7539, 90.3836], [23.7648, 90.3776], [23.7769, 90.3786], [23.7864, 90.4097]], color: '#e2c14a' },
  { name: 'Sonargaon Road', path: [[23.7463, 90.3933], [23.7539, 90.3836]], color: '#f0f0f0' },
  { name: 'Gulshan Avenue', path: [[23.7942, 90.4126], [23.8096, 90.4144], [23.8133, 90.4301], [23.8252, 90.4159]], color: '#e2c14a' },
  { name: 'Tejgaon-Gulshan Link', path: [[23.7672, 90.4273], [23.7995, 90.4349]], color: '#f0f0f0' },
  { name: 'Mughdapara Road', path: [[23.7463, 90.3933], [23.7372, 90.4145]], color: '#f0f0f0' },
];

export const CUSTOMERS: { name: string; lat: number; lng: number }[] = [
  { name: 'Rahim & Sons', lat: 23.7806, lng: 90.4009 },
  { name: 'Ayesha Apparel', lat: 23.7936, lng: 90.4045 },
  { name: 'Karim Traders', lat: 23.7998, lng: 90.3665 },
  { name: 'Sunny Sweets', lat: 23.7864, lng: 90.4097 },
  { name: 'Rina Fashion', lat: 23.8168, lng: 90.4234 },
  { name: 'Mohammed Biriyani', lat: 23.7539, lng: 90.3836 },
  { name: 'Shakib Electronics', lat: 23.7463, lng: 90.3933 },
  { name: 'Nusrat Beauty', lat: 23.8286, lng: 90.4183 },
  { name: 'Habib Pharmacy', lat: 23.8096, lng: 90.4144 },
  { name: 'Tania Gifts', lat: 23.7769, lng: 90.3786 },
  { name: 'Asif Stationery', lat: 23.7917, lng: 90.4192 },
  { name: 'Jahanara Foods', lat: 23.8149, lng: 90.3766 },
  { name: 'Monir Mobile', lat: 23.7995, lng: 90.4349 },
  { name: 'Sadia Shoes', lat: 23.7506, lng: 90.4112 },
  { name: 'Kamal Hardware', lat: 23.8231, lng: 90.4082 },
];

export const RESTAURANTS: { name: string; lat: number; lng: number }[] = [
  { name: 'Dhaka Diner', lat: 23.7936, lng: 90.4045 },
  { name: 'Gulshan Grill', lat: 23.8133, lng: 90.4301 },
  { name: 'Mirpur Biriyani House', lat: 23.7998, lng: 90.3665 },
  { name: 'Baily Road Bistro', lat: 23.7749, lng: 90.4304 },
  { name: 'Banani Burger', lat: 23.8168, lng: 90.4234 },
  { name: 'Dhanmondi Darbar', lat: 23.7539, lng: 90.3836 },
  { name: 'Farmgate Pizza', lat: 23.7864, lng: 90.4097 },
  { name: 'Motijheel Kebab', lat: 23.7822, lng: 90.4145 },
  { name: 'Tejgaon Thai', lat: 23.7995, lng: 90.4349 },
  { name: 'Kuril Kottu', lat: 23.8252, lng: 90.4159 },
  { name: 'Shahbagh Shawarma', lat: 23.7806, lng: 90.4009 },
  { name: 'Badda BBQ', lat: 23.8286, lng: 90.4183 },
];

const BASES: { name: string; lat: number; lng: number }[] = [
  { name: 'Motijheel Hub', lat: 23.7822, lng: 90.4145 },
  { name: 'Mirpur Depot', lat: 23.7998, lng: 90.3665 },
  { name: 'Gulshan HQ', lat: 23.8133, lng: 90.4301 },
  { name: 'Dhanmondi Center', lat: 23.7539, lng: 90.3836 },
];

export const REAL_SPOTS: [number, number, string][] = [
  [23.7822, 90.4145, 'Motijheel'],
  [23.7909, 90.4126, 'Paltan'],
  [23.7393, 90.3916, 'Dhanmondi 27'],
  [23.7648, 90.3776, 'Dhanmondi 32'],
  [23.7539, 90.3836, 'Kalabagan'],
  [23.7463, 90.3933, 'Shukrabad'],
  [23.7672, 90.4273, 'Ramna'],
  [23.8096, 90.4144, 'Mohakhali'],
  [23.7936, 90.4045, 'Farmgate'],
  [23.7806, 90.4009, 'Shahbagh'],
  [23.7998, 90.3665, 'Mirpur 10'],
  [23.8069, 90.3637, 'Mirpur 12'],
  [23.8168, 90.4234, 'Banani 11'],
  [23.7942, 90.4126, 'Kakrail'],
  [23.8188, 90.3682, 'Kazipara'],
  [23.7455, 90.4204, 'Gandaria'],
  [23.8179, 90.3731, 'Shewrapara'],
  [23.7749, 90.4304, 'Baily Road'],
  [23.7769, 90.3786, 'Science Lab'],
  [23.7372, 90.4145, 'Jatrabari'],
  [23.8252, 90.4159, 'Kuril'],
  [23.7864, 90.4097, 'Kawran Bazar'],
  [23.8285, 90.3592, 'Kallyanpur'],
  [23.8133, 90.4301, 'Gulshan 2'],
  [23.7917, 90.4192, 'Segunbagicha'],
  [23.8323, 90.3757, 'Agargaon'],
  [23.7245, 90.3832, 'Hazaribagh'],
  [23.7601, 90.3691, 'Asad Gate'],
  [23.8286, 90.4183, 'Badda'],
  [23.7995, 90.4349, 'Tejgaon'],
];

export type LiveVeh = {
  id: string;
  name: string;
  status: string;
  vehicleType?: string;
  dest?: string;
  speed?: number;
  lat: number;
  lng: number;
  tLat: number;
  tLng: number;
  roadName?: string;
  restLat?: number;
  restLng?: number;
  restName?: string;
  custLat?: number;
  custLng?: number;
  custName?: string;
};

const vehSVG = (v?: string, color?: string) => {
  const t = (v || '').toLowerCase();
  const c = color || '#34d399';
  if (t.includes('van') || t.includes('truck'))
    return `<svg width="30" height="15" viewBox="0 0 64 28"><circle cx="12" cy="21" r="5.8" fill="#0b1220" stroke="#334155"/><circle cx="12" cy="21" r="2.2" fill="#94a3b8"/><circle cx="30" cy="21" r="5.8" fill="#0b1220" stroke="#334155"/><circle cx="30" cy="21" r="2.2" fill="#94a3b8"/><circle cx="52" cy="21" r="5.8" fill="#0b1220" stroke="#334155"/><circle cx="52" cy="21" r="2.2" fill="#94a3b8"/><rect x="8" y="9.5" width="24" height="11" rx="1.5" fill="${c}"/><rect x="13" y="12" width="4" height="3" rx="0.8" fill="#0b1220" opacity="0.4"/><rect x="22" y="12" width="4" height="3" rx="0.8" fill="#0b1220" opacity="0.4"/><rect x="33" y="8" width="22" height="12.5" rx="1.5" fill="${c}"/><rect x="34.5" y="9.5" width="19" height="4.5" rx="1" fill="#0f172a" opacity="0.45"/></svg>`;
  if (t.includes('car'))
    return `<svg width="32" height="16" viewBox="0 0 56 28"><circle cx="13" cy="21" r="5.8" fill="#0b1220" stroke="#334155"/><circle cx="13" cy="21" r="2.2" fill="#94a3b8"/><circle cx="43" cy="21" r="5.8" fill="#0b1220" stroke="#334155"/><circle cx="43" cy="21" r="2.2" fill="#94a3b8"/><path d="M8 18 L13 9.5 Q14.5 6.5 18 6.5 L36 6.5 Q40.5 6.5 42 9.5 L48 18 Q49.5 20 47 21 L9 21 Q6.5 21 8 18 Z" fill="${c}"/><path d="M16 9.5 Q16.5 8 18 8 L27 8 L28.5 12 L17.5 12 Z" fill="#0f172a" opacity="0.55"/><path d="M30 8 L36 8 Q38.5 8 39.5 9.5 L40.5 12 L31 12 Z" fill="#0f172a" opacity="0.55"/></svg>`;
  return `<svg width="30" height="19" viewBox="0 0 48 28"><circle cx="10" cy="21" r="6" fill="#0b1220" stroke="#94a3b8" stroke-width="2"/><circle cx="10" cy="21" r="2.6" fill="#cbd5e1"/><circle cx="38" cy="21" r="6" fill="#0b1220" stroke="#94a3b8" stroke-width="2"/><circle cx="38" cy="21" r="2.6" fill="#cbd5e1"/><path d="M10 20 L13 14 L19 9.5 L25 8.5 L31 12.5 L37 17 L38 20" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 8.5 L27 15 L35 17.5" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="21" y="7.5" width="10" height="3.4" rx="1.7" fill="${c}"/><rect x="13" y="11.5" width="11" height="4.2" rx="2.1" fill="${c}"/><rect x="14.5" y="12.5" width="8" height="2.4" rx="1.2" fill="#0f172a" opacity="0.4"/><path d="M22.5 6.2 Q26 3.8 29.5 6.2 L33 7.6" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="34.5" y="13" width="6" height="4.4" rx="2.2" fill="#fde047" stroke="#f59e0b" stroke-width="0.8"/></svg>`;
};

const DEST_COLOR: Record<string, string> = { Customer: '#34d399', Restaurant: '#f97316', Base: '#60a5fa', Idle: '#f87171' };

const distSeg = (lat: number, lng: number, a: [number, number], b: [number, number]) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((lat - a[0]) ** 2 + (lng - a[1]) ** 2);
  let t = ((lat - a[0]) * dx + (lng - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = a[0] + t * dx, py = a[1] + t * dy;
  return Math.sqrt((lat - px) ** 2 + (lng - py) ** 2);
};

export function nearestRoad(lat: number, lng: number): { name: string; d: number } {
  let best: { name: string; d: number } | null = null;
  MAJOR_ROADS.forEach(r => {
    for (let i = 0; i < r.path.length - 1; i++) {
      const d = distSeg(lat, lng, r.path[i], r.path[i + 1]);
      if (!best || d < best.d) best = { name: r.name, d };
    }
  });
  return best || { name: 'Unknown Road', d: 1 };
}

export default function LeafletMap({ vehicles, zoomTo, onVehicleClick, trackingId, onMapClick, marker, pickup, dropoff, googleDots }: {
  vehicles: LiveVeh[]; zoomTo: number; onVehicleClick?: (id: string) => void; trackingId?: string | null;
  onMapClick?: (lat: number, lng: number) => void; marker?: { lat: number; lng: number } | null;
  pickup?: { lat: number; lng: number; label?: string } | null; dropoff?: { lat: number; lng: number; label?: string } | null;
  googleDots?: boolean;
}) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const fittedRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!divRef.current) return;
    const map = L.map(divRef.current, { zoomControl: true, attributionControl: true }).setView([23.78, 90.4045], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    });

    MAJOR_ROADS.forEach(r => {
      const pl = L.polyline(r.path, { color: r.color, weight: 4, opacity: 0.8, lineCap: 'round' });
      pl.addTo(map);
      pl.bindTooltip(r.name, { sticky: true, direction: 'top' });
    });

    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([23.78, 90.4045], zoomTo, { animate: true });
  }, [zoomTo]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    const dotTrackedVehicle = vehicles.find(v => v.id === trackingId) || vehicles[0];
    let dotRestPt: { lat: number; lng: number; label?: string } | null = pickup && (pickup.lat != null) ? pickup : null;
    let dotCustPt: { lat: number; lng: number; label?: string } | null = dropoff && (dropoff.lat != null) ? dropoff : null;

    if (dotTrackedVehicle && dotTrackedVehicle.restLat != null && dotTrackedVehicle.restLng != null && dotTrackedVehicle.custLat != null && dotTrackedVehicle.custLng != null) {
      dotRestPt = { lat: dotTrackedVehicle.restLat, lng: dotTrackedVehicle.restLng, label: dotTrackedVehicle.restName || 'Restaurant' };
      dotCustPt = { lat: dotTrackedVehicle.custLat, lng: dotTrackedVehicle.custLng, label: dotTrackedVehicle.custName || 'Customer' };
    }

    if (googleDots) {
      const dotIcon = (color: string, label: string, sub: string) => L.divIcon({
        className: '',
        html: `<div style="position:relative;width:106px;height:50px;transform:translate(-43px,-35px);">
          <div style="position:absolute;left:43px;top:14px;width:20px;height:20px;border-radius:50%;background:${color}33;border:2px solid ${color};box-shadow:0 0 0 5px ${color}1f;"></div>
          <div style="position:absolute;left:49px;top:20px;width:8px;height:8px;border-radius:50%;background:#fff;border:2px solid ${color};"></div>
          <div style="position:absolute;left:0;right:0;top:0;margin:auto;width:max-content;max-width:106px;background:#fff;color:#202124;border:1px solid #dadce0;border-radius:8px;padding:2px 6px;text-align:center;box-shadow:0 2px 8px rgba(60,64,67,0.28);font:800 8px/1.2 Arial;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${label}<br><span style="font:700 7px/1.1 Arial;color:#5f6368;">${sub}</span></div>
        </div>`,
        iconSize: [106, 50],
        iconAnchor: [53, 35],
      });

      const routePts: [number, number][] = [];
      if (dotTrackedVehicle) routePts.push([dotTrackedVehicle.lat, dotTrackedVehicle.lng]);
      if (dotRestPt) routePts.push([dotRestPt.lat, dotRestPt.lng]);
      if (dotCustPt) routePts.push([dotCustPt.lat, dotCustPt.lng]);

      if (routePts.length > 1) {
        L.polyline(routePts, { color: '#1a73e8', weight: 5, opacity: 0.78, lineCap: 'round', lineJoin: 'round' }).addTo(layer);
        L.polyline(routePts, { color: '#ffffff', weight: 2, opacity: 0.9, dashArray: '1 10', lineCap: 'round' }).addTo(layer);
      }

      if (dotRestPt) {
        L.marker([dotRestPt.lat, dotRestPt.lng], { icon: dotIcon('#f97316', 'Store Location', dotRestPt.label || 'Pickup') }).addTo(layer);
      }
      if (dotCustPt) {
        L.marker([dotCustPt.lat, dotCustPt.lng], { icon: dotIcon('#34a853', 'Customer', dotCustPt.label || 'Delivery') }).addTo(layer);
      }
      if (dotTrackedVehicle) {
        L.circle([dotTrackedVehicle.lat, dotTrackedVehicle.lng], { radius: 90, color: '#1a73e8', weight: 1, fillColor: '#1a73e8', fillOpacity: 0.12 }).addTo(layer);
        L.marker([dotTrackedVehicle.lat, dotTrackedVehicle.lng], { icon: dotIcon('#1a73e8', 'Driver', 'Current location') }).addTo(layer);
      }

      if (routePts.length && mapRef.current) {
        mapRef.current.fitBounds(L.latLngBounds(routePts), { padding: [38, 38], maxZoom: 15 });
      }
      return;
    }

    vehicles.forEach(v => {
      const dcol = DEST_COLOR[v.dest || 'Idle'] || '#34d399';
      const road = nearestRoad(v.lat, v.lng);
      const roadLabel = v.roadName || road.name;
      const initials = v.name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
      const avatarBg = ['#f59e0b', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#f87171', '#22d3ee', '#4ade80'][Math.abs(v.name.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)) % 8];
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:80px;height:82px;cursor:pointer;">
          <div style="position:absolute;top:30px;left:14px;width:46px;height:6px;border-radius:3px;background:rgba(0,0,0,0.28);filter:blur(1.5px);"></div>
          <div style="position:absolute;top:0;left:22px;width:36px;height:36px;border-radius:50%;background:${avatarBg};border:2.5px solid #0f172a;box-shadow:0 0 0 1.5px ${dcol},0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;color:#0f172a;font:800 13px/1 Arial;letter-spacing:0.5px;">${initials}</div>
          <div style="position:absolute;top:38px;left:30px;width:10px;height:10px;border-radius:50%;background:${dcol};border:1.5px solid #0f172a;"></div>
          <div style="position:absolute;top:41px;left:8px;">${vehSVG(v.vehicleType, dcol)}</div>
          <div style="position:absolute;top:52px;left:0;width:80px;text-align:center;background:rgba(2,6,23,0.88);border:1px solid ${dcol};color:#fff;font:700 8px/1.5 Arial;padding:1px 4px;border-radius:6px;white-space:nowrap;">${v.name.split(' ')[0]} · ${Math.round(v.speed || 0)}km/h</div>
          <div style="position:absolute;top:64px;left:0;width:80px;text-align:center;background:rgba(2,6,23,0.88);color:${dcol};font:700 7.5px/1.5 Arial;padding:1px 4px;border-radius:6px;white-space:nowrap;border:1px solid ${dcol}55;">${v.dest === 'Idle' ? 'Resting' : '→ ' + v.dest}</div>
          <div style="position:absolute;top:76px;left:0;width:80px;text-align:center;color:#e2c14a;font:700 7px/1.4 Arial;text-shadow:0 1px 2px #000;white-space:nowrap;">🛣 ${roadLabel}</div>
        </div>`,
        iconSize: [80, 88],
        iconAnchor: [40, 74],
      });
      const mk = L.marker([v.lat, v.lng], { icon, title: v.name }).addTo(layer);
      mk.on('click', () => { if (onVehicleClick) onVehicleClick(v.id); });
      mk.bindTooltip(`<b>${v.name}</b><br>On: <b>${roadLabel}</b><br>${v.dest || 'Idle'} · ${Math.round(v.speed || 0)} km/h<br>${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`, { direction: 'top', offset: [0, -40], className: 'nexago-tip' });
    });

    const trk = vehicles.find(v => v.id === trackingId);

    let restPt: { lat: number; lng: number; label?: string } | null = pickup && (pickup.lat != null) ? pickup : null;
    let custPt: { lat: number; lng: number; label?: string } | null = dropoff && (dropoff.lat != null) ? dropoff : null;

    if (trk && trk.restLat != null && trk.custLat != null) {
      restPt = { lat: trk.restLat, lng: trk.restLng, label: trk.restName || 'Restaurant' };
      custPt = { lat: trk.custLat, lng: trk.custLng, label: trk.custName || 'Customer' };
    }

    if (restPt && custPt) {
      const tcol = DEST_COLOR[trk?.dest || 'Idle'] || '#34d399';
      const restLabel = restPt.label || 'Restaurant';
      const custLabel = custPt.label || 'Customer';
      const restIcon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:30px;height:30px;transform:translate(-4px,-22px);">
          <div style="position:absolute;inset:0;border-radius:8px;background:rgba(249,115,22,0.25);border:1.5px solid #f97316;transform:rotate(45deg);animation:nexPing 2s infinite;"></div>
          <div style="position:absolute;top:2px;left:2px;width:26px;height:26px;border-radius:6px;background:#2a1606;border:1.5px solid #f97316;display:flex;align-items:center;justify-content:center;font-size:14px;">🍽️</div>
          <div style="position:absolute;top:-10px;left:-6px;background:#f97316;color:#fff;font:700 8px/1.4 Arial;padding:1px 5px;border-radius:6px;white-space:nowrap;">${restLabel}</div>
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 22],
      });
      const custIcon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:30px;height:30px;transform:translate(-4px,-22px);">
          <div style="position:absolute;inset:0;border-radius:50%;background:rgba(52,211,153,0.25);border:1.5px solid #34d399;animation:nexPing 2s infinite;"></div>
          <div style="position:absolute;top:2px;left:2px;width:26px;height:26px;border-radius:50%;background:#062a22;border:1.5px solid #34d399;display:flex;align-items:center;justify-content:center;font-size:14px;">🏠</div>
          <div style="position:absolute;top:-10px;left:-6px;background:#34d399;color:#062a22;font:700 8px/1.4 Arial;padding:1px 5px;border-radius:6px;white-space:nowrap;">${custLabel}</div>
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 22],
      });
      const restM = L.marker([restPt.lat, restPt.lng], { icon: restIcon }).addTo(layer);
      restM.bindTooltip(`<b>${restLabel}</b><br>Pickup`, { direction: 'top' });
      const custM = L.marker([custPt.lat, custPt.lng], { icon: custIcon }).addTo(layer);
      custM.bindTooltip(`<b>${custLabel}</b><br>Delivery`, { direction: 'top' });
      L.polyline([[restPt.lat, restPt.lng], [custPt.lat, custPt.lng]], { color: tcol, weight: 2, opacity: 0.7, dashArray: '5 4' }).addTo(layer);
      L.circleMarker([restPt.lat, restPt.lng], { radius: 3, color: '#f97316', weight: 2, fillColor: '#f97316', fillOpacity: 1 }).addTo(layer);
      L.circleMarker([custPt.lat, custPt.lng], { radius: 3, color: '#34d399', weight: 2, fillColor: '#34d399', fillOpacity: 1 }).addTo(layer);
      if (restPt && custPt) {
        const fitKey = { lat: restPt.lat, lng: custPt.lng };
        if (!fittedRef.current || fittedRef.current.lat !== fitKey.lat || fittedRef.current.lng !== fitKey.lng) {
          if (mapRef.current) {
            mapRef.current.fitBounds(L.latLngBounds([restPt.lat, restPt.lng], [custPt.lat, custPt.lng]), { padding: [45, 45], maxZoom: 14 });
            fittedRef.current = fitKey;
          }
        }
      }
    }

    if (marker) {
      const pinIcon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:30px;height:40px;">
          <div style="position:absolute;top:0;left:0;right:0;margin:auto;width:26px;height:26px;border-radius:50%;background:rgba(16,185,129,0.3);border:2px solid #10b981;display:flex;align-items:center;justify-content:center;font-size:13px;">📍</div>
          <div style="position:absolute;top:23px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:14px solid #10b981;"></div>
          <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:#10b981;color:#fff;font:700 8px/1.4 Arial;padding:1px 6px;border-radius:6px;white-space:nowrap;">Delivery Point</div>
        </div>`,
        iconSize: [30, 40],
        iconAnchor: [15, 40],
      });
      L.marker([marker.lat, marker.lng], { icon: pinIcon }).addTo(layer);
      if (!fittedRef.current || fittedRef.current.lat !== marker.lat || fittedRef.current.lng !== marker.lng) {
        if (mapRef.current) {
          mapRef.current.setView([marker.lat, marker.lng], 14, { animate: true });
          fittedRef.current = { lat: marker.lat, lng: marker.lng };
        }
      }
    }
  }, [vehicles, trackingId, marker, pickup, dropoff, googleDots]);

  return <div ref={divRef} style={{ height: '100%', width: '100%', background: '#0f1a33', position: 'relative', zIndex: 0 }} />;
}
