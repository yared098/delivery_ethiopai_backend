import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ResolvedBranch {
  id: string;
  regionId: string;
  name: string;
  code: string;
  city: string | null;
  distanceKm: number;
}

@Injectable()
export class BranchResolverService {
  private readonly logger = new Logger(BranchResolverService.name);

  // Reject branches further than this
  private readonly MAX_RADIUS_KM = 500;

  constructor(private prisma: PrismaService) {}

  /**
   * Find nearest active branch to a coordinate.
   */
  async findNearestBranch(
    lat: number | null | undefined,
    lng: number | null | undefined,
  ): Promise<ResolvedBranch | null> {
    if (lat == null || lng == null) return null;
    if (lat === 0 && lng === 0) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    try {
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          regionId: string;
          name: string;
          code: string;
          city: string | null;
          distance_km: number;
        }>
      >`
        SELECT
          b.id,
          b."regionId",
          b.name,
          b.code,
          b.city,
          (
            6371 * acos(
              LEAST(1, GREATEST(-1,
                cos(radians(${lat})) *
                cos(radians(b.lat)) *
                cos(radians(b.lng) - radians(${lng})) +
                sin(radians(${lat})) *
                sin(radians(b.lat))
              ))
            )
          ) AS distance_km
        FROM branches b
        WHERE b.lat IS NOT NULL
          AND b.lng IS NOT NULL
          AND b."isActive" = true
        ORDER BY distance_km ASC
        LIMIT 1
      `;

      const row = rows[0];
      if (!row) return null;

      if (row.distance_km > this.MAX_RADIUS_KM) {
        this.logger.warn(
          `Nearest branch ${row.name} is ${row.distance_km.toFixed(1)}km — too far`,
        );
        return null;
      }

      return {
        id: row.id,
        regionId: row.regionId,
        name: row.name,
        code: row.code,
        city: row.city,
        distanceKm: Math.round(row.distance_km * 100) / 100,
      };
    } catch (e: any) {
      this.logger.error(`findNearestBranch failed: ${e.message}`);
      return null;
    }
  }

  /**
   * Resolve both origin and destination branches.
   * Explicit IDs win; else falls back to nearest by GPS.
   */
  async resolveForOrder(input: {
    originBranchId?: string | null;
    destBranchId?: string | null;
    senderLat?: number | null;
    senderLng?: number | null;
    receiverLat?: number | null;
    receiverLng?: number | null;
  }): Promise<{
    originBranchId: string | null;
    destBranchId: string | null;
    originBranch: ResolvedBranch | null;
    destBranch: ResolvedBranch | null;
  }> {
    let originBranch: ResolvedBranch | null = null;
    let destBranch: ResolvedBranch | null = null;

    // Origin
    if (input.originBranchId) {
      originBranch = await this.getBranchById(input.originBranchId);
    }
    if (!originBranch) {
      originBranch = await this.findNearestBranch(
        input.senderLat,
        input.senderLng,
      );
    }

    // Destination
    if (input.destBranchId) {
      destBranch = await this.getBranchById(input.destBranchId);
    }
    if (!destBranch) {
      destBranch = await this.findNearestBranch(
        input.receiverLat,
        input.receiverLng,
      );
    }

    return {
      originBranchId: originBranch?.id ?? null,
      destBranchId: destBranch?.id ?? null,
      originBranch,
      destBranch,
    };
  }

  private async getBranchById(id: string): Promise<ResolvedBranch | null> {
    const b = await this.prisma.branch.findUnique({
      where: { id },
      select: {
        id: true,
        regionId: true,
        name: true,
        code: true,
        city: true,
        isActive: true,
      },
    });
    if (!b || !b.isActive) return null;
    return {
      id: b.id,
      regionId: b.regionId,
      name: b.name,
      code: b.code,
      city: b.city,
      distanceKm: 0,
    };
  }
}