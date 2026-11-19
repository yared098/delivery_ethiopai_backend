import { IsNumber, IsString, IsOptional } from 'class-validator';

export class NearbyOrderDto {
  id: string;
  trackingNumber: string;
  status: string;

  // Sender info (for map pin at pickup)
  senderName: string;
  senderPhone: string;
  senderAddress?: string;
  senderLat?: number;
  senderLng?: number;

  // Receiver info (for map pin at delivery)
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  receiverLat?: number;
  receiverLng?: number;

  // Brief package info (not item details)
  packageDescription?: string;
  totalWeightKg?: number;

  // Earning for courier
  courierEarning?: number;

  // Distance from courier (km)
  distanceKm?: number;

  createdAt: Date;
}
