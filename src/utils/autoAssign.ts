/**
 * Auto-Assign Logistics Utility
 * Matches nearest available drivers to incoming orders using coordinates and duty status.
 */

import { Order, Driver } from '../types';

export interface LocationCoords {
  lat: number;
  lng: number;
  x?: number; // SVG map relative X
  y?: number; // SVG map relative Y
}

export interface DriverMatchResult {
  driver: Driver;
  distanceKm: number;
  etaMinutes: number;
  matchScore: number; // 0 - 100%
  reason: string;
  driverCoords: LocationCoords;
  pickupCoords: LocationCoords;
  isDispatchLocked: boolean;
}

// Known zone & neighborhood coordinates in Dhaka (Lat, Lng) + SVG grid (X, Y)
export const KNOWN_LOCATIONS: Record<string, LocationCoords> = {
  'dhanmondi': { lat: 23.7461, lng: 90.3742, x: 90, y: 310 },
  'gulshan': { lat: 23.7925, lng: 90.4078, x: 350, y: 110 },
  'banani': { lat: 23.7937, lng: 90.4066, x: 210, y: 220 },
  'uttara': { lat: 23.8759, lng: 90.3795, x: 485, y: 80 },
  'mirpur': { lat: 23.8069, lng: 90.3687, x: 100, y: 180 },
  'mohammadpur': { lat: 23.7658, lng: 90.3580, x: 140, y: 260 },
  'bashundhara': { lat: 23.8191, lng: 90.4326, x: 410, y: 160 },
  'baridhara': { lat: 23.8010, lng: 90.4180, x: 390, y: 140 },
  'fresh mart': { lat: 23.7461, lng: 90.3742, x: 90, y: 310 },
  'daily grocery': { lat: 23.7925, lng: 90.4078, x: 350, y: 110 },
  'green basket': { lat: 23.8759, lng: 90.3795, x: 485, y: 80 },
  'super shop': { lat: 23.8069, lng: 90.3687, x: 100, y: 180 },
  'save mart': { lat: 23.7937, lng: 90.4066, x: 210, y: 220 },
  'quick grocery': { lat: 23.7658, lng: 90.3580, x: 140, y: 260 },
  'prime grocery': { lat: 23.8191, lng: 90.4326, x: 410, y: 160 },
  'central hub': { lat: 23.7800, lng: 90.3900, x: 230, y: 180 }
};

// Known driver base locations if not explicitly configured
export const DRIVER_DEFAULT_LOCATIONS: Record<string, LocationCoords> = {
  'DRV123456': { lat: 23.7470, lng: 90.3750, x: 95, y: 305 },  // Rahim Uddin - Dhanmondi
  'DRV123457': { lat: 23.7920, lng: 90.4060, x: 340, y: 115 }, // Al-Amin - Gulshan
  'DRV123458': { lat: 23.8075, lng: 90.3695, x: 105, y: 175 }, // Kamal Hossain - Mirpur
  'DRV123459': { lat: 23.7940, lng: 90.4070, x: 215, y: 215 }, // Babul Akter - Banani
  'DRV123460': { lat: 23.8720, lng: 90.3810, x: 475, y: 85 },  // Tanvir Ahmed - Uttara
  'DRV123461': { lat: 23.7640, lng: 90.3590, x: 145, y: 255 }, // Shamim - Mohammadpur
  'DRV123462': { lat: 23.8180, lng: 90.4310, x: 405, y: 165 }, // Moniruzzaman - Bashundhara
};

/**
 * Get coordinates for an Order / Store location
 */
export function getOrderCoordinates(order: Order): LocationCoords {
  if (order.pickupCoords) return order.pickupCoords;

  const storeKey = order.storeName?.toLowerCase().trim();
  const addressKey = order.address?.toLowerCase().trim();

  // Search known store names or addresses
  for (const [key, coords] of Object.entries(KNOWN_LOCATIONS)) {
    if (storeKey?.includes(key) || addressKey?.includes(key)) {
      return coords;
    }
  }

  // Fallback deterministic coordinate based on address string hash
  const hash = (order.storeName + order.address).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const lat = 23.7400 + (hash % 120) * 0.001;
  const lng = 90.3600 + (hash % 80) * 0.001;
  const x = 50 + (hash % 400);
  const y = 50 + (hash % 280);

  return { lat, lng, x, y };
}

/**
 * Get coordinates for a Driver location
 */
export function getDriverCoordinates(driver: Driver): LocationCoords {
  if (driver.locationCoords) return driver.locationCoords;
  if (DRIVER_DEFAULT_LOCATIONS[driver.id]) return DRIVER_DEFAULT_LOCATIONS[driver.id];

  // Search by driver name or vehicle type
  const hash = (driver.id + driver.name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const lat = 23.7450 + (hash % 110) * 0.001;
  const lng = 90.3650 + (hash % 75) * 0.001;
  const x = 60 + (hash % 380);
  const y = 60 + (hash % 260);

  return { lat, lng, x, y };
}

/**
 * Calculate Haversine distance in kilometers between two points
 */
export function calculateHaversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Return float with 2 decimal places (e.g., 0.85 km)
}

/**
 * Calculate estimated time of arrival (ETA) in minutes
 */
export function calculateETA(distanceKm: number, vehicleType: string = 'Bike'): number {
  // Speed factors (km/h) in traffic
  let avgSpeed = 22; // default bike speed in city
  if (vehicleType.toLowerCase().includes('bicycle')) avgSpeed = 14;
  if (vehicleType.toLowerCase().includes('car') || vehicleType.toLowerCase().includes('van')) avgSpeed = 20;
  if (vehicleType.toLowerCase().includes('motorcycle')) avgSpeed = 26;

  const transitMinutes = (distanceKm / avgSpeed) * 60;
  const dispatchBuffer = 2; // pickup prep time
  return Math.max(2, Math.round(transitMinutes + dispatchBuffer));
}

/**
 * Rank drivers by distance, rating, and suitability for an order
 */
export function rankDriversForOrder(
  order: Order,
  drivers: Driver[],
  strategy: 'distance' | 'eta' | 'balanced' = 'distance',
  includeOnlyOnline: boolean = true
): DriverMatchResult[] {
  const pickupCoords = getOrderCoordinates(order);

  // Filter eligible drivers
  const eligibleDrivers = drivers.filter(d => {
    if (includeOnlyOnline && d.status !== 'Online') return false;
    return true;
  });

  const results: DriverMatchResult[] = eligibleDrivers.map(driver => {
    const driverCoords = getDriverCoordinates(driver);
    const distanceKm = calculateHaversineDistance(
      driverCoords.lat, driverCoords.lng,
      pickupCoords.lat, pickupCoords.lng
    );
    const etaMinutes = calculateETA(distanceKm, driver.vehicleType);
    const isDispatchLocked = !!driver.dispatchLocked;

    // Calculate score (0 to 100)
    let score = 100;

    if (strategy === 'distance') {
      // 100% score at 0 km, minus 15% per km
      score = Math.max(10, 100 - (distanceKm * 15));
    } else if (strategy === 'eta') {
      // 100% score at <= 2 min ETA, minus 5% per minute
      score = Math.max(10, 100 - (etaMinutes * 4));
    } else {
      // Balanced: 60% distance, 30% rating, 10% vehicle type
      const distScore = Math.max(10, 100 - (distanceKm * 15));
      const ratingScore = (driver.rating / 5) * 100;
      score = (distScore * 0.6) + (ratingScore * 0.3) + (driver.vehicleType === 'Bike' || driver.vehicleType === 'Motorcycle' ? 10 : 0);
    }

    // Penalties
    if (driver.status !== 'Online') score -= 50;
    if (isDispatchLocked) score = 0;

    const matchScore = Math.min(99, Math.max(5, Math.round(score)));

    let reason = `${distanceKm} km away in nearby zone (${etaMinutes} min ETA)`;
    if (isDispatchLocked) {
      reason = 'Dispatch Locked by Administrator';
    } else if (distanceKm < 1.0) {
      reason = `Nearest driver (${distanceKm} km away, ~${etaMinutes} mins ETA)`;
    } else if (driver.rating >= 4.8) {
      reason = `Top-rated courier (${driver.rating}★) - ${distanceKm} km away`;
    }

    return {
      driver,
      distanceKm,
      etaMinutes,
      matchScore,
      reason,
      driverCoords,
      pickupCoords,
      isDispatchLocked
    };
  });

  // Sort by score descending (or distance ascending)
  return results.sort((a, b) => {
    if (a.isDispatchLocked && !b.isDispatchLocked) return 1;
    if (!a.isDispatchLocked && b.isDispatchLocked) return -1;
    return b.matchScore - a.matchScore || a.distanceKm - b.distanceKm;
  });
}

/**
 * Find the single best nearest driver for an order
 */
export function findBestDriverForOrder(
  order: Order,
  drivers: Driver[],
  strategy: 'distance' | 'eta' | 'balanced' = 'distance'
): DriverMatchResult | null {
  const ranked = rankDriversForOrder(order, drivers, strategy, true);
  if (ranked.length === 0 || ranked[0].isDispatchLocked) return null;
  return ranked[0];
}

/**
 * Batch Auto-Assign all pending unassigned orders optimally
 */
export function autoAssignAllPendingOrders(
  orders: Order[],
  drivers: Driver[],
  strategy: 'distance' | 'eta' | 'balanced' = 'distance'
): {
  assignments: Array<{ order: Order; driver: Driver; match: DriverMatchResult }>;
  unassignedOrders: Order[];
} {
  const pending = orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Processing');
  const availableDrivers = [...drivers.filter(d => d.status === 'Online' && !d.dispatchLocked)];

  const assignments: Array<{ order: Order; driver: Driver; match: DriverMatchResult }> = [];
  const unassignedOrders: Order[] = [];

  for (const order of pending) {
    if (availableDrivers.length === 0) {
      unassignedOrders.push(order);
      continue;
    }

    // Find best match among remaining available drivers
    const matches = rankDriversForOrder(order, availableDrivers, strategy, true);
    if (matches.length > 0 && !matches[0].isDispatchLocked) {
      const bestMatch = matches[0];
      assignments.push({
        order,
        driver: bestMatch.driver,
        match: bestMatch
      });

      // Remove matched driver if we want 1-to-1 assignment per round, or keep if driver can take multiple orders
      // For clean fleet distribution, remove assigned driver from single-pass availability pool
      const driverIdx = availableDrivers.findIndex(d => d.id === bestMatch.driver.id);
      if (driverIdx !== -1) {
        availableDrivers.splice(driverIdx, 1);
      }
    } else {
      unassignedOrders.push(order);
    }
  }

  return { assignments, unassignedOrders };
}
