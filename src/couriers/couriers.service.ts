import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourierDto } from './dto/create-courier.dto';
import { UpdateCourierDto } from './dto/update-courier.dto';
import { ListCouriersQueryDto } from './dto/list-couriers-query.dto';
import { RejectCourierDto } from './dto/reject-courier.dto';
import { AccountType, CourierStatus, StaffRole } from '@prisma/client';

@Injectable()
export class CouriersService {
  constructor(private prisma: PrismaService) {}

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
    if (digits.length === 9) return '251' + digits;
    throw new BadRequestException('Invalid phone');
  }

  // ══════════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════════
  async create(dto: CreateCourierDto, currentUser: any) {
    const phone = this.normalizePhone(dto.phone);

    if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      dto.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only create couriers in your region');
    }

    const region = await this.prisma.region.findUnique({
      where: { id: dto.regionId },
    });
    if (!region) throw new NotFoundException('Region not found');

    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    if (branch.regionId !== dto.regionId) {
      throw new BadRequestException('Branch does not belong to this region');
    }

    const existing = await this.prisma.courier.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('A courier with this phone already exists');
    }

    if (dto.email) {
      const emailExists = await this.prisma.courier.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) throw new ConflictException('Email already in use');
    }

    if (dto.vehiclePlate) {
      const dup = await this.prisma.courier.findFirst({
        where: { vehiclePlate: dto.vehiclePlate },
      });
      if (dup) throw new ConflictException('Vehicle plate already registered');
    }

    const passwordHash = dto.password ? await argon2.hash(dto.password) : null;

    // ✅ Explicitly build data with scalars only
    const data: any = {
      phone,
      name: dto.name,
      email: dto.email,
      regionId: dto.regionId,
      branchId: dto.branchId,
      vehicleType: dto.vehicleType,
      vehiclePlate: dto.vehiclePlate,
      vehicleModel: dto.vehicleModel,
      vehicleColor: dto.vehicleColor,
      vehicleYear: dto.vehicleYear,
      licenseNumber: dto.licenseNumber,
      maxWeightKg: dto.maxWeightKg,
      maxVolumeL: dto.maxVolumeL,
      handlesFragile: dto.handlesFragile ?? false,
      handlesRefrigerated: dto.handlesRefrigerated ?? false,
      nationalIdNumber: dto.nationalIdNumber,
      nationalIdImageUrl: dto.nationalIdImageUrl,
      licenseImageUrl: dto.licenseImageUrl,
      vehicleImageUrl: dto.vehicleImageUrl,
      selfieUrl: dto.selfieUrl,
      passwordHash,
      passwordChangedAt: passwordHash ? new Date() : null,
      status: CourierStatus.PENDING,
      isActive: true,
      phoneVerified: false,
      createdById: currentUser.id,
    };

    return this.prisma.courier.create({
      data,
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        regionId: true,
        branchId: true,
        vehicleType: true,
        vehiclePlate: true,
        status: true,
        rating: true,
        totalDeliveries: true,
        createdAt: true,
        region: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  }

  // ══════════════════════════════════════════════════
  // LIST
  // ══════════════════════════════════════════════════
  async findAll(query: ListCouriersQueryDto, currentUser: any) {
    const where: any = {};

    if (currentUser.role === StaffRole.REGIONAL_ADMIN) {
      where.regionId = currentUser.regionId;
    } else if (query.regionId) {
      where.regionId = query.regionId;
    }

    if (query.status) where.status = query.status;
    if (query.vehicleType) where.vehicleType = query.vehicleType;
    if (query.branchId) where.branchId = query.branchId;

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { vehiclePlate: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.courier.findMany({
        where,
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          regionId: true,
          branchId: true,
          vehicleType: true,
          vehiclePlate: true,
          status: true,
          rating: true,
          totalDeliveries: true,
          isOnline: true,
          isActive: true,
          createdAt: true,
          region: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.courier.count({ where }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════
  // GET ONE
  // ══════════════════════════════════════════════════
  async findOne(id: string, currentUser: any) {
    const courier = await this.prisma.courier.findUnique({
      where: { id },
      include: {
        region: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!courier) throw new NotFoundException('Courier not found');

    if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      courier.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only view couriers in your region');
    }

    return courier;
  }

  // ══════════════════════════════════════════════════
  // UPDATE (FIXED — scalars only, explicit whitelist)
  // ══════════════════════════════════════════════════
  async update(id: string, dto: UpdateCourierDto, currentUser: any) {
    const existing = await this.prisma.courier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Courier not found');

    if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      existing.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only edit couriers in your region');
    }

    // ── Validate region change ──
    const targetRegionId = dto.regionId ?? existing.regionId;
    if (dto.regionId && dto.regionId !== existing.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) throw new NotFoundException('Region not found');

      if (
        currentUser.role === StaffRole.REGIONAL_ADMIN &&
        dto.regionId !== currentUser.regionId
      ) {
        throw new ForbiddenException('You can only move couriers within your region');
      }
    }

    // ── Validate branch change ──
    const targetBranchId = dto.branchId ?? existing.branchId;
    if (dto.branchId && dto.branchId !== existing.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) throw new NotFoundException('Branch not found');
      if (branch.regionId !== targetRegionId) {
        throw new BadRequestException('Branch does not belong to this region');
      }
    }

    // ── Normalize phone if changed ──
    let phone: string | undefined;
    if (dto.phone) {
      phone = this.normalizePhone(dto.phone);
      if (phone !== existing.phone) {
        const dup = await this.prisma.courier.findUnique({ where: { phone } });
        if (dup) throw new ConflictException('Phone already in use');
      }
    }

    // ── Check email uniqueness if changed ──
    if (dto.email && dto.email !== existing.email) {
      const dup = await this.prisma.courier.findUnique({
        where: { email: dto.email },
      });
      if (dup) throw new ConflictException('Email already in use');
    }

    // ── Check plate uniqueness if changed ──
    if (dto.vehiclePlate && dto.vehiclePlate !== existing.vehiclePlate) {
      const dup = await this.prisma.courier.findFirst({
        where: { vehiclePlate: dto.vehiclePlate },
      });
      if (dup) throw new ConflictException('Vehicle plate already registered');
    }

    // ✅ Build data with scalar fields only
    const data: any = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (phone) data.phone = phone;
    if (dto.regionId !== undefined) data.regionId = dto.regionId;
    if (dto.branchId !== undefined) data.branchId = dto.branchId;
    if (dto.vehicleType !== undefined) data.vehicleType = dto.vehicleType;
    if (dto.vehiclePlate !== undefined) data.vehiclePlate = dto.vehiclePlate;
    if (dto.vehicleModel !== undefined) data.vehicleModel = dto.vehicleModel;
    if (dto.vehicleColor !== undefined) data.vehicleColor = dto.vehicleColor;
    if (dto.vehicleYear !== undefined) data.vehicleYear = dto.vehicleYear;
    if (dto.licenseNumber !== undefined) data.licenseNumber = dto.licenseNumber;
    if (dto.maxWeightKg !== undefined) data.maxWeightKg = dto.maxWeightKg;
    if (dto.maxVolumeL !== undefined) data.maxVolumeL = dto.maxVolumeL;
    if (dto.handlesFragile !== undefined) data.handlesFragile = dto.handlesFragile;
    if (dto.handlesRefrigerated !== undefined) data.handlesRefrigerated = dto.handlesRefrigerated;
    if (dto.nationalIdNumber !== undefined) data.nationalIdNumber = dto.nationalIdNumber;
    if (dto.nationalIdImageUrl !== undefined) data.nationalIdImageUrl = dto.nationalIdImageUrl;
    if (dto.licenseImageUrl !== undefined) data.licenseImageUrl = dto.licenseImageUrl;
    if (dto.vehicleImageUrl !== undefined) data.vehicleImageUrl = dto.vehicleImageUrl;
    if (dto.selfieUrl !== undefined) data.selfieUrl = dto.selfieUrl;

    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
      data.passwordChangedAt = new Date();
    }

    return this.prisma.courier.update({
      where: { id },
      data,
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        regionId: true,
        branchId: true,
        vehicleType: true,
        vehiclePlate: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  // ══════════════════════════════════════════════════
  // APPROVE
  // ══════════════════════════════════════════════════
  async approve(id: string, currentUser: any) {
    await this.findOne(id, currentUser);

    return this.prisma.courier.update({
      where: { id },
      data: {
        status: CourierStatus.APPROVED,
        approvedById: currentUser.id,
        approvedAt: new Date(),
        rejectionReason: null,
      },
      select: { id: true, status: true, approvedAt: true },
    });
  }

  // ══════════════════════════════════════════════════
  // REJECT
  // ══════════════════════════════════════════════════
  async reject(id: string, dto: RejectCourierDto, currentUser: any) {
    await this.findOne(id, currentUser);

    return this.prisma.courier.update({
      where: { id },
      data: {
        status: CourierStatus.REJECTED,
        rejectionReason: dto.reason,
        rejectedById: currentUser.id,
        rejectedAt: new Date(),
      },
      select: { id: true, status: true, rejectionReason: true },
    });
  }

  // ══════════════════════════════════════════════════
  // SUSPEND
  // ══════════════════════════════════════════════════
  async suspend(id: string, currentUser: any) {
    await this.findOne(id, currentUser);

    await this.prisma.courier.update({
      where: { id },
      data: {
        status: CourierStatus.SUSPENDED,
        isActive: false,
        isOnline: false,
        suspendedAt: new Date(),
        suspendedById: currentUser.id,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { accountId: id, accountType: AccountType.COURIER, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Courier suspended' };
  }

  // ══════════════════════════════════════════════════
  // REACTIVATE
  // ══════════════════════════════════════════════════
  async reactivate(id: string, currentUser: any) {
    await this.findOne(id, currentUser);

    await this.prisma.courier.update({
      where: { id },
      data: {
        status: CourierStatus.APPROVED,
        isActive: true,
        suspendedAt: null,
        suspendedById: null,
      },
    });

    return { message: 'Courier reactivated' };
  }
}
