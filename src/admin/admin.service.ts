import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';

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

  // ──────────────────────────────────────────────
  // CREATE STAFF (Regional Admin / Branch Manager / Courier)
  // ──────────────────────────────────────────────
  async createStaff(dto: CreateStaffDto, createdById: string) {
    if (dto.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot create another Super Admin via API');
    }

    if (dto.role === Role.CUSTOMER) {
      throw new BadRequestException('Use customer signup flow for customers');
    }

    const phone = this.normalizePhone(dto.phone);

    // Validate role requirements
    if (dto.role === Role.REGIONAL_ADMIN && !dto.regionId) {
      throw new BadRequestException('Regional Admin requires a regionId');
    }
    if (
      (dto.role === Role.BRANCH_MANAGER || dto.role === Role.COURIER) &&
      (!dto.regionId || !dto.branchId)
    ) {
      throw new BadRequestException(
        `${dto.role} requires both regionId and branchId`,
      );
    }

    // Check region exists
    if (dto.regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
      });
      if (!region) throw new NotFoundException('Region not found');
    }

    // Check branch exists + belongs to region
    if (dto.branchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) throw new NotFoundException('Branch not found');
      if (dto.regionId && branch.regionId !== dto.regionId) {
        throw new BadRequestException('Branch does not belong to this region');
      }
    }

    // Prevent duplicate phone
    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('A user with this phone already exists');
    }

    // Prevent duplicate email
    if (dto.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) throw new ConflictException('Email already in use');
    }

    return this.prisma.user.create({
      data: {
        phone,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        regionId: dto.regionId,
        branchId: dto.branchId,
        isActive: true,
        phoneVerified: false, // they'll verify on first OTP login
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  // ──────────────────────────────────────────────
  // LIST USERS with filters
  // ──────────────────────────────────────────────
  async listUsers(query: ListUsersQueryDto, currentUser: any) {
    const where: any = {};

    // Region admins only see their region
    if (currentUser.role === Role.REGIONAL_ADMIN) {
      where.regionId = currentUser.regionId;
    }

    if (query.role) where.role = query.role;
    if (query.regionId) where.regionId = query.regionId;
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
      this.prisma.user.findMany({
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
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // ──────────────────────────────────────────────
  // GET ONE USER
  // ──────────────────────────────────────────────
  async getUser(id: string, currentUser: any) {
    const user = await this.prisma.user.findUnique({
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
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        region: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Region admin scoping
    if (
      currentUser.role === Role.REGIONAL_ADMIN &&
      user.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only view users in your region');
    }

    return user;
  }

  // ──────────────────────────────────────────────
  // UPDATE USER
  // ──────────────────────────────────────────────
  async updateUser(id: string, dto: UpdateUserDto, currentUser: any) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');

    // Cannot modify super admins
    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot modify Super Admin');
    }

    // Region admin scoping
    if (
      currentUser.role === Role.REGIONAL_ADMIN &&
      target.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only modify users in your region');
    }

    // Cannot promote to Super Admin
    if (dto.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot promote to Super Admin');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto as any,
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        role: true,
        regionId: true,
        branchId: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  // ──────────────────────────────────────────────
  // DEACTIVATE USER (soft delete)
  // ──────────────────────────────────────────────
  async deactivateUser(id: string, currentUser: any) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('User not found');

    if (target.role === Role.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot deactivate Super Admin');
    }

    if (
      currentUser.role === Role.REGIONAL_ADMIN &&
      target.regionId !== currentUser.regionId
    ) {
      throw new ForbiddenException('You can only deactivate users in your region');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Revoke all sessions
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'User deactivated and all sessions revoked' };
  }
}
