import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { CustomerJwtGuard } from '../common/guards/customer-jwt.guard';
import { CurrentCustomer } from '../common/decorators/current-customer.decorator';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';
import { AccountType } from '@prisma/client';

@Controller('customer/orders')
@UseGuards(CustomerJwtGuard)
export class CustomerOrdersController {
  constructor(
    private orders: OrdersService,
    private prisma: PrismaService,
  ) {}

  // ══════════════════════════════════════════════════
  // CREATE — sender is the logged-in customer
  // ══════════════════════════════════════════════════
  @Post()
  async create(
    @Body() dto: CreateCustomerOrderDto,
    @CurrentCustomer() customer: any,
  ) {
    const actor = {
      id: customer.id,
      name: customer.name || 'Customer',
      accountType: AccountType.CUSTOMER,
      role: 'CUSTOMER',
    };

    return this.orders.create(
      {
        ...dto,
        sender: {
          ...dto.sender,
          customerId: customer.id,
        },
      } as any,
      actor,
    );
  }

  // ══════════════════════════════════════════════════
  // LIST — sent / received / all
  // ══════════════════════════════════════════════════
  @Get()
  async list(
    @CurrentCustomer() customer: any,
    @Query('type') type: 'sent' | 'received' | 'all' = 'all',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (type === 'sent') where.senderId = customer.id;
    else if (type === 'received') where.receiverId = customer.id;
    else
      where.OR = [
        { senderId: customer.id },
        { receiverId: customer.id },
      ];

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          sender: { select: { id: true, name: true, phone: true } },
          receiver: { select: { id: true, name: true, phone: true } },
          courier: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: take,
      pages: Math.ceil(total / take),
    };
  }

  // ══════════════════════════════════════════════════
  // DETAIL
  // ══════════════════════════════════════════════════
  @Get(':id')
  async detail(
    @Param('id') id: string,
    @CurrentCustomer() customer: any,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        OR: [
          { senderId: customer.id },
          { receiverId: customer.id },
        ],
      },
      include: {
        items: true,
        sender: { select: { id: true, name: true, phone: true } },
        receiver: { select: { id: true, name: true, phone: true } },
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            vehicleType: true,
            vehiclePlate: true,
            currentLat: true,
            currentLng: true,
          },
        },
        events: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    return order;
  }
}