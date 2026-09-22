import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
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
        createdAt: true,
        region: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    });

    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }
}
