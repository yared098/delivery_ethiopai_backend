import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { StaffRole } from '@prisma/client';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBranchDto, user: any) {
    const region = await this.prisma.region.findUnique({
      where: { id: dto.regionId },
    });
    if (!region) throw new NotFoundException('Region not found');

    if (user.role === StaffRole.REGIONAL_ADMIN && user.regionId !== dto.regionId) {
      throw new BadRequestException('You can only create branches in your region');
    }

    const nameExists = await this.prisma.branch.findFirst({
      where: { regionId: dto.regionId, name: dto.name },
    });
    if (nameExists) {
      throw new ConflictException('Branch with this name already exists in the region');
    }

    const codeExists = await this.prisma.branch.findUnique({
      where: { code: dto.code },
    });
    if (codeExists) {
      throw new ConflictException('Branch with this code already exists');
    }

    return this.prisma.branch.create({
      data: {
        regionId: dto.regionId,
        name: dto.name,
        code: dto.code,
        city: dto.city,
        woreda: dto.woreda,
        address: dto.address,
        phone: dto.phone,
        lat: dto.lat,
        lng: dto.lng,
      },
      include: {
        region: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findAll(regionId: string | undefined, user: any) {
    const where: any = {};

    if (user.role === StaffRole.REGIONAL_ADMIN) {
      where.regionId = user.regionId;
    } else if (regionId) {
      where.regionId = regionId;
    }

    return this.prisma.branch.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        region: { select: { id: true, name: true, code: true } },
        _count: { select: { staff: true, couriers: true } },
      },
    });
  }

  async findOne(id: string, user: any) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        region: { select: { id: true, name: true, code: true } },
        _count: { select: { staff: true, couriers: true } },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    if (user.role === StaffRole.REGIONAL_ADMIN && branch.regionId !== user.regionId) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(id: string, dto: UpdateBranchDto, user: any) {
    const existing = await this.findOne(id, user);

    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) throw new NotFoundException('Region not found');

      if (user.role === StaffRole.REGIONAL_ADMIN && user.regionId !== dto.regionId) {
        throw new ForbiddenException('You can only move branches within your region');
      }
    }

    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.prisma.branch.findUnique({
        where: { code: dto.code },
      });
      if (codeExists) throw new ConflictException('Branch code already in use');
    }

    return this.prisma.branch.update({
      where: { id },
      data: dto,
      include: {
        region: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async remove(id: string, user: any) {
    const branch = await this.findOne(id, user);

    const staffCount = await this.prisma.staff.count({ where: { branchId: id } });
    const courierCount = await this.prisma.courier.count({ where: { branchId: id } });

    if (staffCount > 0 || courierCount > 0) {
      throw new BadRequestException(
        `Cannot delete branch with ${staffCount} staff and ${courierCount} couriers`,
      );
    }

    await this.prisma.branch.delete({ where: { id: branch.id } });
    return { message: 'Branch deleted' };
  }
}
