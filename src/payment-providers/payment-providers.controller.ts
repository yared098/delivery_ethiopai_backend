import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { IsArray } from 'class-validator';
import { PaymentProvidersService } from './payment-providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ListProvidersQueryDto } from './dto/list-providers-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StaffRoles } from '../common/decorators/staff-roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StaffRole } from '@prisma/client';

class ReorderDto {
  @IsArray()
  items: { id: string; sortOrder: number }[];
}

@Controller('admin/payment-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentProvidersController {
  constructor(private providers: PaymentProvidersService) {}

  // ────────────────────────────────────────────────
  // ENABLED — any staff can see (for dropdowns)
  // ────────────────────────────────────────────────

  @Get('enabled')
  @StaffRoles(StaffRole.SUPER_ADMIN, StaffRole.REGIONAL_ADMIN, StaffRole.BRANCH_MANAGER)
  findEnabled() {
    return this.providers.findEnabled();
  }

  // ────────────────────────────────────────────────
  // SUPER ADMIN CRUD
  // ────────────────────────────────────────────────

  @Post()
  @StaffRoles(StaffRole.SUPER_ADMIN)
  create(@Body() dto: CreateProviderDto, @CurrentUser() user: any) {
    return this.providers.create(dto, user);
  }

  @Get()
  @StaffRoles(StaffRole.SUPER_ADMIN)
  findAll(@Query() query: ListProvidersQueryDto) {
    return this.providers.findAll(query);
  }

  @Post('reorder')
  @StaffRoles(StaffRole.SUPER_ADMIN)
  reorder(@Body() dto: ReorderDto, @CurrentUser() user: any) {
    return this.providers.reorder(dto.items, user);
  }

  @Get('by-code/:code')
  @StaffRoles(StaffRole.SUPER_ADMIN)
  findByCode(@Param('code') code: string) {
    return this.providers.findByCode(code);
  }

  @Get(':id')
  @StaffRoles(StaffRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.providers.findOne(id);
  }

  @Patch(':id')
  @StaffRoles(StaffRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto,
    @CurrentUser() user: any,
  ) {
    return this.providers.update(id, dto, user);
  }

  @Post(':id/toggle')
  @StaffRoles(StaffRole.SUPER_ADMIN)
  toggle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.providers.toggleEnabled(id, user);
  }

  @Delete(':id')
  @StaffRoles(StaffRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.providers.remove(id, user);
  }

  @Get(':id/secret-status')
@StaffRoles(StaffRole.SUPER_ADMIN)
async secretStatus(@Param('id') id: string) {
  // Directly query DB with secrets
  const provider = await (this.providers as any).prisma.paymentProvider.findUnique({
    where: { id },
  });
  if (!provider) throw new NotFoundException('Provider not found');
  return {
    code: provider.code,
    hasApiKey: !!provider.apiKey,
    hasApiSecret: !!provider.apiSecret,
    apiSecretLength: provider.apiSecret?.length || 0,
    apiSecretPrefix: provider.apiSecret?.slice(0, 14) || null,
    apiSecretSuffix: provider.apiSecret?.slice(-4) || null,
    merchantId: provider.merchantId,
    webhookUrl: provider.webhookUrl,
    isEnabled: provider.isEnabled,
    isTestMode: provider.isTestMode,
  };
}
}
