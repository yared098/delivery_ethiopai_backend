import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { AccountType } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10) return '251' + digits.slice(1);
    if (digits.length === 9) return '251' + digits;
    throw new BadRequestException('Invalid phone');
  }

  async create(dto: CreateCustomerDto, currentUser: any) {
    const phone = this.normalizePhone(dto.phone);

    const existing = await this.prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      throw new ConflictException('A customer with this phone already exists');
    }

    if (dto.email) {
      const emailExists = await this.prisma.customer.findUnique({
        where: { email: dto.email },
      });
      if (emailExists) throw new ConflictException('Email already in use');
    }

    return this.prisma.customer.create({
      data: {
        phone,
        name: dto.name,
        email: dto.email,
        defaultAddress: dto.defaultAddress,
        defaultLat: dto.defaultLat,
        defaultLng: dto.defaultLng,
        registeredById: currentUser.id,
        registeredByType: AccountType.STAFF,
        isActive: true,
      },
      select: this.publicSelect(),
    });
  }

  async findAll(query: ListCustomersQueryDto) {
    const where: any = {};

    if (query.isActive !== undefined) where.isActive = query.isActive;

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
      this.prisma.customer.findMany({
        where,
        select: this.publicSelect(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        ...this.publicSelect(),
        _count: {
          select: {
            ordersSent: true,
            ordersReceived: true,
          },
        },
      },
    });

    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async findByPhone(phone: string) {
    const normalized = this.normalizePhone(phone);
    const customer = await this.prisma.customer.findUnique({
      where: { phone: normalized },
      select: this.publicSelect(),
    });
    return customer; // may be null — for order form lookup
  }

  async update(id: string, dto: UpdateCustomerDto, currentUser: any) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found');

    const data: any = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.defaultAddress !== undefined) data.defaultAddress = dto.defaultAddress;
    if (dto.defaultLat !== undefined) data.defaultLat = dto.defaultLat;
    if (dto.defaultLng !== undefined) data.defaultLng = dto.defaultLng;

    if (dto.phone) {
      const phone = this.normalizePhone(dto.phone);
      if (phone !== existing.phone) {
        const dup = await this.prisma.customer.findUnique({ where: { phone } });
        if (dup) throw new ConflictException('Phone already in use');
      }
      data.phone = phone;
    }

    if (dto.email && dto.email !== existing.email) {
      const dup = await this.prisma.customer.findUnique({
        where: { email: dto.email },
      });
      if (dup) throw new ConflictException('Email already in use');
    }

    return this.prisma.customer.update({
      where: { id },
      data,
      select: this.publicSelect(),
    });
  }

  async suspend(id: string, currentUser: any) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found');

    await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.refreshToken.updateMany({
      where: { accountId: id, accountType: AccountType.CUSTOMER, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Customer suspended' };
  }

  async reactivate(id: string, currentUser: any) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Customer not found');

    await this.prisma.customer.update({
      where: { id },
      data: { isActive: true },
    });

    return { message: 'Customer reactivated' };
  }

  async remove(id: string, currentUser: any) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { ordersSent: true, ordersReceived: true } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const totalOrders = customer._count.ordersSent + customer._count.ordersReceived;
    if (totalOrders > 0) {
      throw new BadRequestException(
        `Cannot delete customer with ${totalOrders} orders. Suspend instead.`,
      );
    }

    await this.prisma.refreshToken.deleteMany({
      where: { accountId: id, accountType: AccountType.CUSTOMER },
    });
    await this.prisma.otpCode.deleteMany({ where: { customerId: id } });
    await this.prisma.customer.delete({ where: { id } });

    return { message: 'Customer deleted' };
  }

  // ─── Shared public select ───
  private publicSelect() {
    return {
      id: true,
      phone: true,
      name: true,
      email: true,
      phoneVerified: true,
      emailVerified: true,
      isActive: true,
      defaultAddress: true,
      defaultLat: true,
      defaultLng: true,
      registeredById: true,
      registeredByType: true,
      registeredBy: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
    };
  }
}
