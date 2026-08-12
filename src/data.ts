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

export const getZonesWithDefaults = (): Zone[] => getStoredData<Zone[]>('sd_zones', []);
