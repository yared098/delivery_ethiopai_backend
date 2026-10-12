import { Branch, Order, VehicleType } from '@prisma/client';

export type RouteType = 'INTRA_REGION' | 'INTER_REGION' | 'UNKNOWN';

export interface RouteInfo {
  type: RouteType;
  originRegionId: string | null;
  deliveryRegionId: string | null;
  distanceKm: number;
  eligibleVehicles: VehicleType[];
  category: 'MICRO' | 'INTRA_CITY' | 'SHORT_HAUL' | 'INTER_CITY' | 'LONG_HAUL';
}

export function analyzeRoute(
  order: Order & { originBranch: Branch | null; destBranch: Branch | null },
): RouteInfo {
  const originRegionId = order.originBranch?.regionId ?? null;
  const deliveryRegionId = order.destBranch?.regionId ?? null;

  let type: RouteType = 'UNKNOWN';
  if (originRegionId && deliveryRegionId) {
    type =
      originRegionId === deliveryRegionId ? 'INTRA_REGION' : 'INTER_REGION';
  }

  const distanceKm = order.distanceKm ?? order.routeDistanceKm ?? 0;
  const eligibleVehicles = getEligibleVehicles(distanceKm, order.totalWeightKg);
  const category = getRouteCategory(distanceKm);

  return {
    type,
    originRegionId,
    deliveryRegionId,
    distanceKm,
    eligibleVehicles,
    category,
  };
}

export function getRouteCategory(distanceKm: number) {
  if (distanceKm <= 5) return 'MICRO' as const;
  if (distanceKm <= 15) return 'INTRA_CITY' as const;
  if (distanceKm <= 100) return 'SHORT_HAUL' as const;
  if (distanceKm <= 500) return 'INTER_CITY' as const;
  return 'LONG_HAUL' as const;
}

export function getEligibleVehicles(
  distanceKm: number,
  weightKg: number,
): VehicleType[] {
  const byDistance: VehicleType[] = [];
  if (distanceKm <= 5) byDistance.push('BICYCLE', 'MOTORCYCLE', 'CAR');
  else if (distanceKm <= 15) byDistance.push('MOTORCYCLE', 'CAR', 'VAN');
  else if (distanceKm <= 100) byDistance.push('CAR', 'VAN', 'TRUCK');
  else if (distanceKm <= 500) byDistance.push('VAN', 'TRUCK');
  else byDistance.push('TRUCK');

  const byWeight: VehicleType[] = [];
  if (weightKg <= 5) byWeight.push('BICYCLE');
  if (weightKg <= 20) byWeight.push('MOTORCYCLE');
  if (weightKg <= 100) byWeight.push('CAR');
  if (weightKg <= 500) byWeight.push('VAN');
  byWeight.push('TRUCK');

  return byDistance.filter((v) => byWeight.includes(v));
}

export function getOfferConfig(category: string) {
  switch (category) {
    case 'MICRO':
      return { broadcastSize: 3, timeoutMs: 20_000, maxRetries: 2 };
    case 'INTRA_CITY':
      return { broadcastSize: 3, timeoutMs: 30_000, maxRetries: 2 };
    case 'SHORT_HAUL':
      return { broadcastSize: 5, timeoutMs: 2 * 60_000, maxRetries: 2 };
    case 'INTER_CITY':
      return { broadcastSize: 5, timeoutMs: 5 * 60_000, maxRetries: 1 };
    case 'LONG_HAUL':
      return { broadcastSize: 10, timeoutMs: 15 * 60_000, maxRetries: 1 };
    default:
      return { broadcastSize: 3, timeoutMs: 30_000, maxRetries: 2 };
  }
}

export function getMaxConcurrent(category: string): number {
  switch (category) {
    case 'MICRO':
      return 5;
    case 'INTRA_CITY':
      return 3;
    case 'SHORT_HAUL':
      return 2;
    case 'INTER_CITY':
      return 1;
    case 'LONG_HAUL':
      return 1;
    default:
      return 3;
  }
}

export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}