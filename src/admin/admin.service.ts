import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { AccountType, StaffRole } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
    if (digits.length === 9) return '251' + digits;
    throw new BadRequestException('Invalid phone');
  }

  async createStaff(dto: CreateStaffDto, role: StaffRole, currentUser: any) {
    if (role === StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot create another Super Admin');
    }

    const phone = this.normalizePhone(dto.phone);

    // Role requirements
    if (role === StaffRole.REGIONAL_ADMIN && !dto.regionId) {
      throw new BadRequestException('Regional Admin requires a regionId');
    }
    if (role === StaffRole.BRANCH_MANAGER && (!dto.regionId || !dto.branchId)) {
      throw new BadRequestException('Branch Manager requires regionId and branchId');
    }

    // Region scoping
    if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      dto.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only create staff in your region');
    }

    // Validate region
    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) throw new NotFoundException('Region not found');
    }

    // Validate branch
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) throw new NotFoundException('Branch not found');
      if (dto.regionId && branch.regionId !== dto.regionId) {
        throw new BadRequestException('Branch does not belong to this region');
      }
    }

    // Duplicate phone
    const existing = await this.prisma.staff.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('A staff member with this phone already exists');
    }

    // Duplicate email
    if (dto.email) {
      const emailExists = await this.prisma.staff.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) throw new ConflictException('Email already in use');
    }

    const passwordHash = dto.password ? await argon2.hash(dto.password) : null;

    // ✅ Build data object with ONLY scalar FKs (UncheckedCreateInput)
    const data: any = {
      phone,
      name: dto.name,
      email: dto.email,
      role,
      passwordHash,
      passwordChangedAt: passwordHash ? new Date() : null,
      mustChangePassword: passwordHash ? (dto.mustChangePassword ?? false) : false,
      isActive: true,
      phoneVerified: false,
      createdById: currentUser.id,
    };

    if (dto.regionId) data.regionId = dto.regionId;
    if (dto.branchId) data.branchId = dto.branchId;

    return this.prisma.staff.create({
      data,
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        branchId: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });
  }

  async listStaff(query: ListStaffQueryDto, currentUser: any) {
    const where: any = {};

    if (currentUser.role === StaffRole.REGIONAL_ADMIN) {
      where.regionId = currentUser.regionId;
    } else if (query.regionId) {
      where.regionId = query.regionId;
    }

    if (query.role) where.role = query.role;
    if (query.branchId) where.branchId = query.branchId;

    if (query.search) {
      where.OR = [
        { phone: { contains: query.search } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          role: true,
          regionId: true,
          branchId: true,
          isActive: true,
          phoneVerified: true,
          mustChangePassword: true,
          suspendedAt: true,
          createdAt: true,
          region: { select: { id: true, name: true, code: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.staff.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getStaff(id: string, currentUser: any) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        branchId: true,
        isActive: true,
        phoneVerified: true,
        mustChangePassword: true,
        suspendedAt: true,
        createdAt: true,
        region: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!staff) throw new NotFoundException('Staff not found');

    if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      staff.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only view staff in your region');
    }

    return staff;
  }

  async suspendStaff(id: string, currentUser: any) {
    const target = await this.prisma.staff.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Staff not found');

    if (target.role === StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot suspend Super Admin');
    }

    if (target.id === currentUser.id) {
      throw new ForbiddenException('Cannot suspend yourself');
    }

    if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      target.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only suspend staff in your region');
    }

    await this.prisma.staff.update({
      where: { id },
      data: {
        isActive: false,
        suspendedAt: new Date(),
        suspendedById: currentUser.id,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { accountId: id, accountType: AccountType.STAFF, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Staff suspended' };
  }

  async reactivateStaff(id: string, currentUser: any) {
    const target = await this.prisma.staff.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Staff not found');

    if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      target.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only reactivate staff in your region');
    }

    await this.prisma.staff.update({
      where: { id },
      data: {
        isActive: true,
        suspendedAt: null,
        suspendedById: null,
      },
    });

    return { message: 'Staff reactivated' };
  }

  async resetPassword(id: string, newPassword: string, currentUser: any) {
    const target = await this.prisma.staff.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Staff not found');

    if (
      currentUser.role === StaffRole.REGIONAL_ADMIN &&
      target.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only reset passwords in your region');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.staff.update({
      where: { id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: true,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { accountId: id, accountType: AccountType.STAFF, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password reset' };
  }
}
