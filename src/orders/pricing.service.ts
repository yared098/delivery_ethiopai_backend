import { Injectable, BadRequestException } from '@nestjs/common';
import { ItemType } from '@prisma/client';

interface PricingInput {
  distanceKm: number;
  totalWeightKg: number;
  items: Array<{
    type: ItemType;
    quantity: number;
    isFragile?: boolean;
    isRefrigerated?: boolean;
  }>;
  regionMultiplier?: number;
}

// Return type compatible with Prisma Json field
export interface PricingBreakdown {
  baseFee: number;
  distanceCharge: number;
  weightCharge: number;
  itemSurcharges: number;
  subtotal: number;
  regionMultiplier: number;
  total: number;
  currency: string;
  [key: string]: any;   // ← add index signature for Prisma Json
}

const BASE_FEE = 50;        // ETB
const PER_KM = 15;          // ETB/km
const PER_KG = 20;          // ETB/kg
const MIN_PRICE = 100;      // ETB
const FRAGILE_SURCHARGE = 30;
const REFRIGERATED_SURCHARGE = 50;

const ITEM_TYPE_FEES: Record<ItemType, number> = {
  PARCEL: 0,
  DOCUMENT: 10,
  BOX: 15,
  ENVELOPE: 5,
  FOOD: 25,
  ELECTRONICS: 40,
  CLOTHING: 10,
  MEDICINE: 20,
  FRAGILE_ITEM: 30,
  OTHER: 0,
};

@Injectable()
export class PricingService {
  calculate(input: PricingInput): PricingBreakdown {
    if (input.distanceKm < 0 || input.totalWeightKg < 0) {
      throw new BadRequestException('Invalid pricing input');
    }

    const baseFee = BASE_FEE;
    const distanceCharge = input.distanceKm * PER_KM;
    const weightCharge = input.totalWeightKg * PER_KG;

    let itemSurcharges = 0;
    for (const item of input.items) {
      const qty = item.quantity || 1;
      itemSurcharges += (ITEM_TYPE_FEES[item.type] || 0) * qty;
      if (item.isFragile) itemSurcharges += FRAGILE_SURCHARGE * qty;
      if (item.isRefrigerated) itemSurcharges += REFRIGERATED_SURCHARGE * qty;
    }

    const subtotal = baseFee + distanceCharge + weightCharge + itemSurcharges;
    const regionMultiplier = input.regionMultiplier ?? 1.0;
    let total = subtotal * regionMultiplier;

    if (total < MIN_PRICE) total = MIN_PRICE;

    total = Math.round(total * 100) / 100;

    return {
      baseFee,
      distanceCharge: round2(distanceCharge),
      weightCharge: round2(weightCharge),
      itemSurcharges: round2(itemSurcharges),
      subtotal: round2(subtotal),
      regionMultiplier,
      total,
      currency: 'ETB',
    };
  }

  distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  courierEarning(deliveryFee: number): number {
    return Math.round(deliveryFee * 0.6 * 100) / 100;
  }

  platformFee(deliveryFee: number): number {
    return Math.round(deliveryFee * 0.4 * 100) / 100;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
