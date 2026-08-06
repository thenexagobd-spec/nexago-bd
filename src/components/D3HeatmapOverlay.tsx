import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { Order, Driver } from '../types';
import { getOrderCoordinates, getDriverCoordinates } from '../utils/autoAssign';

export type HeatmapMode = 'orders' | 'drivers' | 'imbalance' | 'combined';
export type HeatmapPalette = 'inferno' | 'turbo' | 'plasma' | 'amber' | 'emerald';

interface D3HeatmapOverlayProps {
  orders: Order[];
  drivers: Driver[];
  width?: number;
  height?: number;
  mode?: HeatmapMode;
  bandwidth?: number; // Kernel density bandwidth (e.g., 25)
  opacity?: number;
  palette?: HeatmapPalette;
  showHotspots?: boolean;
}

interface DensityPoint {
  x: number;
  y: number;
  weight: number;
  type: 'order' | 'driver';
  label?: string;
}

export const D3HeatmapOverlay: React.FC<D3HeatmapOverlayProps> = ({
  orders,
  drivers,
  width = 500,
  height = 360,
  mode = 'orders',
  bandwidth = 28,
  opacity = 0.65,
  palette = 'inferno',
  showHotspots = true,
}) => {
  // 1. Prepare data points with weighted coordinates based on selected heatmap mode
  const points = useMemo<DensityPoint[]>(() => {
    const list: DensityPoint[] = [];

    if (mode === 'orders' || mode === 'combined' || mode === 'imbalance') {
      orders.forEach((o) => {
        const coords = getOrderCoordinates(o);
        if (coords.x !== undefined && coords.y !== undefined) {
          let w = 1.0;
          if (o.status === 'Pending') w = 3.5;
          else if (o.status === 'Processing' || o.status === 'Confirmed') w = 2.5;
          else if (o.status === 'Ongoing') w = 1.5;
          else if (o.status === 'Completed') w = 0.4;

          list.push({
            x: coords.x,
            y: coords.y,
            weight: mode === 'imbalance' ? w : w,
            type: 'order',
            label: `Order #${o.id} (${o.storeName})`,
          });
        }
      });
    }

    if (mode === 'drivers' || mode === 'combined' || mode === 'imbalance') {
      drivers.forEach((d) => {
        const coords = getDriverCoordinates(d);
        if (coords.x !== undefined && coords.y !== undefined) {
          let w = 1.0;
          if (d.status === 'Online') w = 2.5;
          else if (d.status === 'On-Delivery') w = 1.8;
          else w = 0.3;

          list.push({
            x: coords.x,
            y: coords.y,
            weight: mode === 'imbalance' ? -w * 1.2 : w,
            type: 'driver',
            label: `Driver ${d.name} (${d.status})`,
          });
        }
      });
    }

    return list;
  }, [orders, drivers, mode]);

  // 2. Generate D3 Contours using d3.contourDensity
  const { contours, colorScale, maxValue, peakPoints } = useMemo(() => {
    if (points.length === 0) {
      return { contours: [], colorScale: () => '#000000', maxValue: 0, peakPoints: [] };
    }

    // Determine weight bounds
    const maxW = d3.max(points, (p: DensityPoint) => Math.abs(p.weight)) || 1;

    // Configure D3 Contour Density generator
    const densityGenerator = d3
      .contourDensity<DensityPoint>()
      .x((d) => d.x)
      .y((d) => d.y)
      .weight((d) => d.weight)
      .size([width, height])
      .bandwidth(bandwidth)
      .thresholds(16);

    // Compute MultiPolygon contour geometry objects
    const computedContours = densityGenerator(points);
    const pathGenerator = d3.geoPath();

    // Find max value across contours for color scaling
    const maxVal = d3.max(computedContours, (c) => c.value) || 0.001;

    // Pick D3 Color Interpolator based on chosen palette
    let interpolator = d3.interpolateInferno;
    if (palette === 'turbo') interpolator = d3.interpolateTurbo;
    else if (palette === 'plasma') interpolator = d3.interpolatePlasma;
    else if (palette === 'amber') interpolator = d3.interpolateYlOrRd;
    else if (palette === 'emerald') interpolator = d3.interpolateViridis;

    // Create D3 sequential color scale
    const scale = d3.scaleSequential(interpolator).domain([0, maxVal]);

    // Format contours with SVG path strings & hex colors
    const formattedContours = computedContours.map((c) => ({
      d: pathGenerator(c) || '',
      value: c.value,
      color: scale(c.value),
    }));

    // Identify local peak density hotspots (top 3 highest weight clusters)
    const sortedPoints = [...points].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    const peaks = sortedPoints.slice(0, 4);

    return {
      contours: formattedContours,
      colorScale: scale,
      maxValue: maxVal,
      peakPoints: peaks,
    };
  }, [points, width, height, bandwidth, palette]);

  return (
    <g className="d3-heatmap-overlay pointer-events-none transition-opacity duration-500" opacity={opacity}>
      <defs>
        {/* Heatmap blend filter */}
        <filter id="d3-heatmap-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Render D3 Density Polygon Contours */}
      <g filter="url(#d3-heatmap-blur)">
        {contours.map((contour, i) => (
          <path
            key={`contour-${i}`}
            d={contour.d}
            fill={contour.color}
            fillOpacity={0.45 + (contour.value / (maxValue || 1)) * 0.45}
            stroke={contour.color}
            strokeWidth="1"
            strokeOpacity={0.6}
          />
        ))}
      </g>

      {/* Highlight Peak Focal Hotspot Rings */}
      {showHotspots &&
        peakPoints.map((peak, idx) => (
          <g key={`peak-${idx}`} transform={`translate(${peak.x}, ${peak.y})`}>
            <circle
              r={12 + idx * 3}
              fill="none"
              stroke={mode === 'drivers' ? '#10b981' : '#ff7a00'}
              strokeWidth="1.5"
              strokeDasharray="4 2"
              className="animate-spin-slow"
              opacity="0.8"
            />
            <circle
              r="4"
              fill={mode === 'drivers' ? '#10b981' : '#ff7a00'}
              className="animate-ping"
              opacity="0.6"
            />
          </g>
        ))}
    </g>
  );
};

export default D3HeatmapOverlay;
