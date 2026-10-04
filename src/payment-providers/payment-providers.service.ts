import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ListProvidersQueryDto } from './dto/list-providers-query.dto';
import { StaffRole } from '@prisma/client';

@Injectable()
export class PaymentProvidersService {
  constructor(private prisma: PrismaService) {}

  // ══════════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════════
  async create(dto: CreateProviderDto, currentUser: any) {
    if (currentUser.role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can add payment providers');
    }

    const code = dto.code.toUpperCase().trim();

    const existing = await this.prisma.paymentProvider.findUnique({
      where: { code },
    });
    if (existing) {
      throw new ConflictException(`Provider with code ${code} already exists`);
    }

    return this.prisma.paymentProvider.create({
      data: {
        code,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        logoUrl: dto.logoUrl,
        color: dto.color,
        sortOrder: dto.sortOrder ?? 0,
        isEnabled: dto.isEnabled ?? false,
        isTestMode: dto.isTestMode ?? true,
        feePercent: dto.feePercent ?? 0,
        feeFixed: dto.feeFixed ?? 0,
        minAmount: dto.minAmount,
        maxAmount: dto.maxAmount,
        apiKey: dto.apiKey?.trim() || null,
        apiSecret: dto.apiSecret?.trim() || null,
        merchantId: dto.merchantId?.trim() || null,
        webhookUrl: dto.webhookUrl?.trim() || null,
        configJson: dto.configJson,
        createdById: currentUser.id,
      },
      select: this.publicSelect(),
    });
  }

  // ══════════════════════════════════════════════════
  // LIST ALL (Super Admin)
  // ══════════════════════════════════════════════════
  async findAll(query: ListProvidersQueryDto) {
    const where: any = {};

    if (query.type) where.type = query.type;
    if (query.isEnabled !== undefined) where.isEnabled = query.isEnabled;

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.paymentProvider.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: this.publicSelect(),
    });
  }

  // ══════════════════════════════════════════════════
  // LIST ENABLED (for courier & customer apps)
  // ══════════════════════════════════════════════════
  async findEnabled() {
    return this.prisma.paymentProvider.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        logoUrl: true,
        color: true,
        feePercent: true,
        feeFixed: true,
        minAmount: true,
        maxAmount: true,
      },
    });
  }

  // ══════════════════════════════════════════════════
  // GET ONE
  // ══════════════════════════════════════════════════
  async findOne(id: string) {
    const provider = await this.prisma.paymentProvider.findUnique({
      where: { id },
      select: this.publicSelect(),
    });

    if (!provider) throw new NotFoundException('Payment provider not found');
    return provider;
  }

  async findByCode(code: string) {
    const provider = await this.prisma.paymentProvider.findUnique({
      where: { code: code.toUpperCase() },
      select: this.publicSelect(),
    });

    if (!provider) throw new NotFoundException('Payment provider not found');
    return provider;
  }

  // ══════════════════════════════════════════════════
  // UPDATE — critical fix here
  // ══════════════════════════════════════════════════
  async update(id: string, dto: UpdateProviderDto, currentUser: any) {
    if (currentUser.role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can edit payment providers');
    }

    await this.findOne(id);

    const data: any = { updatedById: currentUser.id };

    // Copy all fields EXCEPT apiSecret / apiKey / configJson (handled separately)
    const { apiSecret, apiKey, configJson, ...rest } = dto;
    Object.assign(data, rest);

    // ✅ Only update apiSecret if a NON-EMPTY value was provided
    if (
      apiSecret !== undefined &&
      apiSecret !== null &&
      apiSecret.trim() !== ''
    ) {
      data.apiSecret = apiSecret.trim();
    }

    // ✅ Only update apiKey if NON-EMPTY
    if (apiKey !== undefined && apiKey !== null && apiKey.trim() !== '') {
      data.apiKey = apiKey.trim();
    }

    // configJson: update if provided
    if (configJson !== undefined && configJson !== null) {
      data.configJson = configJson;
    }

    // Handle code change
    if (dto.code) {
      const code = dto.code.toUpperCase().trim();
      const existing = await this.prisma.paymentProvider.findUnique({
        where: { code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Provider with code ${code} already exists`);
      }
      data.code = code;
    }

    return this.prisma.paymentProvider.update({
      where: { id },
      data,
      select: this.publicSelect(),
    });
  }

  // ══════════════════════════════════════════════════
  // TOGGLE ENABLE / DISABLE
  // ══════════════════════════════════════════════════
  async toggleEnabled(id: string, currentUser: any) {
    if (currentUser.role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can enable/disable providers');
    }

    const provider = await this.findOne(id);
    const newState = !provider.isEnabled;

    await this.prisma.paymentProvider.update({
      where: { id },
      data: { isEnabled: newState, updatedById: currentUser.id },
    });

    return {
      isEnabled: newState,
      message: newState ? 'Provider enabled' : 'Provider disabled',
    };
  }

  // ══════════════════════════════════════════════════
  // REORDER
  // ══════════════════════════════════════════════════
  async reorder(items: { id: string; sortOrder: number }[], currentUser: any) {
    if (currentUser.role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can reorder');
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.paymentProvider.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder, updatedById: currentUser.id },
        }),
      ),
    );

    return { message: 'Reordered' };
  }

  // ══════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════
  async remove(id: string, currentUser: any) {
    if (currentUser.role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can delete payment providers');
    }

    await this.findOne(id);
    await this.prisma.paymentProvider.delete({ where: { id } });

    return { message: 'Payment provider deleted' };
  }

  // ══════════════════════════════════════════════════
  // HELPER — SAFE select (never returns secrets)
  // ══════════════════════════════════════════════════
  private publicSelect() {
    return {
      id: true,
      code: true,
      name: true,
      description: true,
      type: true,
      logoUrl: true,
      color: true,
      sortOrder: true,
      isEnabled: true,
      isTestMode: true,
      feePercent: true,
      feeFixed: true,
      minAmount: true,
      maxAmount: true,
      merchantId: true,
      webhookUrl: true,

      // ⚠️ Secrets are NOT selected — never sent to frontend
      // Frontend can use these boolean flags to know if a key exists
      apiKey: true,        // ← public key, safe to return
      // apiSecret: NOT selected (commented means omitted)

      createdAt: true,
      updatedAt: true,
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
    };
  }
}