/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Driver, Zone, User, Payment, Vehicle, PromotionBanner, SupportTicket, SystemNotification } from './types';

// Production defaults must stay empty. Real records come from storage/cloud APIs.
export const defaultOrders: Order[] = [];
export const defaultDrivers: Driver[] = [];
export const defaultZones: Zone[] = [];
export const defaultUsers: User[] = [];
export const defaultPayments: Payment[] = [];
export const defaultVehicles: Vehicle[] = [];
export const defaultBanners: PromotionBanner[] = [];
export const defaultSupportTickets: SupportTicket[] = [];
export const defaultNotifications: SystemNotification[] = [];

export const getStoredData = <T>(key: string, defaultValue: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const setStoredData = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('nexago-local-write'));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
};

const pendingStoredData = new Map<string, string>();
let pendingStoredDataTimer: number | null = null;

const flushStoredData = () => {
  if (pendingStoredDataTimer !== null) {
    window.clearTimeout(pendingStoredDataTimer);
    pendingStoredDataTimer = null;
  }
  if (!pendingStoredData.size) return;
  try {
    pendingStoredData.forEach((payload, key) => localStorage.setItem(key, payload));
    pendingStoredData.clear();
    window.dispatchEvent(new Event('nexago-local-write'));
  } catch (error) {
    console.error('Error flushing localStorage queue:', error);
  }
};

export const setStoredDataDebounced = <T>(key: string, value: T, wait = 300): void => {
  if (typeof window === 'undefined') {
    setStoredData(key, value);
    return;
  }
  try {
    pendingStoredData.set(key, JSON.stringify(value));
    if (pendingStoredDataTimer !== null) window.clearTimeout(pendingStoredDataTimer);
    pendingStoredDataTimer = window.setTimeout(flushStoredData, wait);
  } catch (error) {
    console.error(`Error queueing ${key} for localStorage:`, error);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushStoredData);
  window.addEventListener('beforeunload', flushStoredData);
}

export const getZonesWithDefaults = (): Zone[] => getStoredData<Zone[]>('sd_zones', []);
