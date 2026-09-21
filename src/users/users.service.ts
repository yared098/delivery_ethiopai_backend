import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOrCreateByPhone(phone: string) {
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, role: Role.CUSTOMER, phoneVerified: true },
      });
    } else if (!user.phoneVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });
    }
    return user;
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createGoogleUser(data: {
    googleId: string;
    email: string;
    name?: string;
  }) {
    return this.prisma.user.create({
      data: {
        googleId: data.googleId,
        email: data.email,
        name: data.name,
        role: Role.CUSTOMER,
        emailVerified: true,
      },
    });
  }

  async linkGoogleToUser(
    userId: string,
    data: { googleId: string; email?: string; name?: string },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        googleId: data.googleId,
        email: data.email,
        name: data.name,
        emailVerified: true,
      },
    });
  }

  async linkPhone(userId: string, phone: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { phone, phoneVerified: true },
    });
  }

  async findById(id: string) {
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
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
